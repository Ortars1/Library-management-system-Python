from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from .models import Loan
from .serializers import LoanSerializer
from .services import issue_book, return_book, get_overdue_loans
from apps.catalog.models import Book
from apps.users.models import User


class IsLibrarianPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['librarian', 'admin']


class LoanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Loan.objects.select_related('book__category', 'book__publisher', 'user')
        if self.request.user.role in ['librarian', 'admin']:
            return qs  # видят все выдачи
        return qs.filter(user=self.request.user)  # читатель — только свои

    # ── Для библиотекарей: выдать книгу конкретному читателю ──────────────────
    @action(detail=False, methods=['post'], permission_classes=[IsLibrarianPermission])
    def issue(self, request):
        """Оформить выдачу книги (только библиотекарь/admin)"""
        book_id = request.data.get('book_id')
        user_id = request.data.get('user_id')

        try:
            book = Book.objects.get(pk=book_id)
            user = User.objects.get(pk=user_id)
        except (Book.DoesNotExist, User.DoesNotExist):
            raise ValidationError("Книга или пользователь не найдены")

        loan = issue_book(book, user)
        return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)

    # ── Для читателей: самостоятельно взять книгу ─────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def borrow(self, request):
        """Читатель берёт книгу самостоятельно"""
        book_id = request.data.get('book_id')
        if not book_id:
            raise ValidationError("Укажите book_id")

        try:
            book = Book.objects.get(pk=book_id)
        except Book.DoesNotExist:
            raise ValidationError("Книга не найдена")

        loan = issue_book(book, request.user)
        return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)

    # ── Возврат книги (библиотекарь/admin) ────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsLibrarianPermission])
    def return_book(self, request, pk=None):
        """Оформить возврат книги"""
        loan = self.get_object()
        loan = return_book(loan)
        return Response(LoanSerializer(loan).data)

    # ── Список просроченных (библиотекарь/admin) ──────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[IsLibrarianPermission])
    def overdue(self, request):
        """Список просроченных выдач"""
        loans = get_overdue_loans()
        serializer = self.get_serializer(loans, many=True)
        return Response(serializer.data)

    # ── Активная выдача текущего пользователя по книге ────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_active(self, request):
        """ID книг, которые сейчас на руках у текущего пользователя"""
        active_book_ids = Loan.objects.filter(
            user=request.user, status='active'
        ).values_list('book_id', flat=True)
        return Response({'active_book_ids': [str(bid) for bid in active_book_ids]})

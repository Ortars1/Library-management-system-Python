from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import ValidationError
from .models import Loan

DEFAULT_LOAN_PERIOD_DAYS = 14


@transaction.atomic
def issue_book(book, user, loan_period_days=DEFAULT_LOAN_PERIOD_DAYS):
    """
    Оформление выдачи книги с транзакционной безопасностью.
    Использует select_for_update для предотвращения гонки копий.
    """
    book = type(book).objects.select_for_update().get(pk=book.pk)

    if book.available_copies < 1:
        raise ValidationError("Нет доступных копий книги")

    # Проверяем, не взял ли пользователь эту книгу уже
    if Loan.objects.filter(book=book, user=user, status='active').exists():
        raise ValidationError("Вы уже взяли эту книгу")

    loan = Loan.objects.create(
        book=book,
        user=user,
        due_date=timezone.now().date() + timedelta(days=loan_period_days),
        status='active'
    )

    book.available_copies -= 1
    book.save(update_fields=['available_copies'])

    return loan


@transaction.atomic
def return_book(loan):
    """Оформление возврата книги."""
    if loan.status != 'active':
        raise ValidationError(f"Невозможно вернуть книгу со статусом: {loan.status}")

    book = type(loan.book).objects.select_for_update().get(pk=loan.book.pk)

    loan.return_date = timezone.now().date()
    loan.status = 'returned'
    loan.save(update_fields=['return_date', 'status'])

    book.available_copies += 1
    book.save(update_fields=['available_copies'])

    return loan


def get_overdue_loans():
    """Получение всех просроченных активных выдач"""
    today = timezone.now().date()
    return Loan.objects.filter(
        status='active',
        due_date__lt=today
    ).select_related('book', 'user')

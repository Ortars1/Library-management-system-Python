"""
Usage: python manage.py seed
Creates demo users, books and a few loans so the app is usable out of the box.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.catalog.models import Category, Publisher, Author, Book, BookAuthor
from apps.circulation.models import Loan
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # Users
        admin, _ = User.objects.get_or_create(username='admin', defaults={'role': 'admin', 'email': 'admin@lib.ru', 'is_staff': True, 'is_superuser': True})
        admin.set_password('admin123')
        admin.save()

        librarian, _ = User.objects.get_or_create(username='librarian1', defaults={'role': 'librarian', 'email': 'lib@lib.ru'})
        librarian.set_password('lib123')
        librarian.save()

        reader, _ = User.objects.get_or_create(username='reader1', defaults={'role': 'reader', 'email': 'reader@lib.ru'})
        reader.set_password('reader123')
        reader.save()

        # Categories
        klassika, _ = Category.objects.get_or_create(name='Классика')
        psych, _ = Category.objects.get_or_create(name='Психологический роман')
        fantasy, _ = Category.objects.get_or_create(name='Фантастика')
        poetry, _ = Category.objects.get_or_create(name='Поэзия')

        # Publishers
        eksmo, _ = Publisher.objects.get_or_create(name='Эксмо')
        ast, _ = Publisher.objects.get_or_create(name='АСТ')
        rech, _ = Publisher.objects.get_or_create(name='Речь')

        # Authors
        tolstoy, _ = Author.objects.get_or_create(first_name='Лев', last_name='Толстой')
        dostoevsky, _ = Author.objects.get_or_create(first_name='Фёдор', last_name='Достоевский')
        bulgakov, _ = Author.objects.get_or_create(first_name='Михаил', last_name='Булгаков')
        pushkin, _ = Author.objects.get_or_create(first_name='Александр', last_name='Пушкин')

        # Books
        books_data = [
            ('978-5-04-089775-1', 'Война и мир', 1869, 5, 3, tolstoy, klassika, eksmo),
            ('978-5-17-090800-3', 'Преступление и наказание', 1866, 3, 1, dostoevsky, psych, ast),
            ('978-5-04-116640-5', 'Мастер и Маргарита', 1967, 4, 0, bulgakov, fantasy, eksmo),
            ('978-5-9268-1573-1', 'Евгений Онегин', 1833, 12, 12, pushkin, poetry, rech),
            ('978-5-17-099264-0', 'Идиот', 1869, 3, 2, dostoevsky, psych, ast),
            ('978-5-04-122300-1', 'Анна Каренина', 1878, 4, 4, tolstoy, klassika, eksmo),
        ]

        for isbn, title, year, total, avail, author, cat, pub in books_data:
            book, created = Book.objects.get_or_create(isbn=isbn, defaults={
                'title': title,
                'publication_year': year,
                'total_copies': total,
                'available_copies': avail,
                'category': cat,
                'publisher': pub,
            })
            if created:
                BookAuthor.objects.get_or_create(book=book, author=author)

        # Demo loans
        book1 = Book.objects.get(isbn='978-5-04-089775-1')
        book2 = Book.objects.get(isbn='978-5-17-090800-3')
        book3 = Book.objects.get(isbn='978-5-9268-1573-1')

        today = timezone.now().date()
        if not Loan.objects.filter(user=reader, book=book1, status='active').exists():
            Loan.objects.create(user=reader, book=book1, issue_date=today - timedelta(days=5), due_date=today + timedelta(days=9), status='active')
        if not Loan.objects.filter(user=reader, book=book2).exists():
            Loan.objects.create(user=reader, book=book2, issue_date=today - timedelta(days=30), due_date=today - timedelta(days=16), status='active')
        if not Loan.objects.filter(user=reader, book=book3, status='returned').exists():
            Loan.objects.create(user=reader, book=book3, issue_date=today - timedelta(days=60), due_date=today - timedelta(days=46), return_date=today - timedelta(days=50), status='returned')

        self.stdout.write(self.style.SUCCESS(
            '\nDemo data created!\n'
            '  admin / admin123  (superuser)\n'
            '  librarian1 / lib123\n'
            '  reader1 / reader123\n'
        ))

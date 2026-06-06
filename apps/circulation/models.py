from django.db import models
from django.utils import timezone
import uuid
from apps.users.models import User
from apps.catalog.models import Book

class Loan(models.Model):
    STATUS_CHOICES = (
        ('active', 'Активна'),
        ('returned', 'Возвращена'),
        ('overdue', 'Просрочена'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    book = models.ForeignKey(Book, on_delete=models.PROTECT, related_name='loans')
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='loans')
    
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField()  # рассчитывается при создании
    return_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'loans'
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['due_date', 'status']),
        ]
    
    def __str__(self):
        return f"Loan #{self.id} - {self.book.title} → {self.user.username}"
    
    def is_overdue(self):
        """Проверка просрочки без сохранения в БД"""
        if self.status != 'active':
            return False
        return timezone.now().date() > self.due_date
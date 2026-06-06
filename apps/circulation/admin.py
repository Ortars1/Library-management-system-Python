from django.contrib import admin
from .models import Loan

@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('id', 'book', 'user', 'issue_date', 'due_date', 'status', 'return_date')
    list_filter = ('status', 'due_date')
    search_fields = ('book__title', 'user__username')
    readonly_fields = ('id', 'issue_date', 'created_at')
from django.contrib import admin
from .models import Category, Publisher, Author, Book, BookAuthor

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Publisher)
class PublisherAdmin(admin.ModelAdmin):
    list_display = ('name', 'address')
    search_fields = ('name',)

@admin.register(Author)  # ✅ ДОБАВЛЕНО
class AuthorAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name')
    search_fields = ('last_name', 'first_name')
    ordering = ('last_name', 'first_name')

class BookAuthorInline(admin.TabularInline):
    model = BookAuthor
    extra = 1

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'isbn', 'category', 'publisher', 'total_copies', 'available_copies', 'is_active')
    list_filter = ('category', 'publisher', 'is_active')
    search_fields = ('title', 'isbn')
    inlines = [BookAuthorInline]
    readonly_fields = ('available_copies',)  # Управление только через сервисы выдачи/возврата
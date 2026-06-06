from rest_framework import serializers
from .models import Book, Category, Publisher, Author, BookAuthor

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ('id', 'first_name', 'last_name')

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description')

class PublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = ('id', 'name', 'address')

class BookSerializer(serializers.ModelSerializer):
    authors = AuthorSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    publisher = PublisherSerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True)
    publisher_id = serializers.UUIDField(write_only=True)
    author_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )
    
    class Meta:
        model = Book
        fields = '__all__'
        read_only_fields = ('available_copies', 'created_at', 'updated_at')
    
    def create(self, validated_data):
        author_ids = validated_data.pop('author_ids', [])
        book = Book.objects.create(**validated_data)
        if author_ids:
            book.authors.set(author_ids)
        return book
    
    def update(self, instance, validated_data):
        author_ids = validated_data.pop('author_ids', None)
        book = super().update(instance, validated_data)
        if author_ids is not None:
            book.authors.set(author_ids)
        return book
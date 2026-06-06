from rest_framework import serializers
from .models import Loan
from apps.catalog.serializers import BookSerializer
from apps.users.serializers import UserSerializer


class LoanSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    # write-only поля — необязательные, используются только в issue (staff)
    book_id = serializers.UUIDField(write_only=True, required=False)
    user_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Loan
        fields = '__all__'
        read_only_fields = ('issue_date', 'status', 'created_at')

    def validate(self, data):
        if 'book_id' in data and 'user_id' in data:
            book = data.get('book_id')
            if book and hasattr(book, 'available_copies') and book.available_copies < 1:
                raise serializers.ValidationError("Нет доступных копий")
        return data

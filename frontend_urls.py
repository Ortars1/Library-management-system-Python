from django.urls import path
from django.views.generic import TemplateView

urlpatterns = [
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('catalog/', TemplateView.as_view(template_name='catalog.html'), name='catalog'),
    path('book/<uuid:pk>/', TemplateView.as_view(template_name='book_detail.html'), name='book_detail'),
    path('login/', TemplateView.as_view(template_name='login.html'), name='login'),
    path('my-loans/', TemplateView.as_view(template_name='my_loans.html'), name='my_loans'),
    path('reports/', TemplateView.as_view(template_name='reports.html'), name='reports'),
]

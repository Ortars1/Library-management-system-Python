from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from apps.catalog.views import BookViewSet, CategoryViewSet, PublisherViewSet, AuthorViewSet
from apps.circulation.views import LoanViewSet
from apps.users.views import CustomTokenObtainPairView

router = DefaultRouter()
router.register(r'catalog/books', BookViewSet, basename='book')
router.register(r'catalog/categories', CategoryViewSet, basename='category')
router.register(r'catalog/publishers', PublisherViewSet, basename='publisher')
router.register(r'catalog/authors', AuthorViewSet, basename='author')
router.register(r'loans', LoanViewSet, basename='loan')

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/', include(router.urls)),

    # Frontend (SPA served by Django templates)
    path('', include('frontend_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

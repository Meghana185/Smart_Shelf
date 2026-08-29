from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.management import call_command
from .views import (
    health_check,
    LoginView,
    RequestOTPView,
    VerifyOTPView,
    CategoryViewSet,
    ProductViewSet,
    BillingLookupView,
    CheckoutView,
    CustomerPurchasesView,
    ExpiryRiskPredictionView,
    RecipeSuggestionsView,
    ChatbotConversationView,
    StaffManagementView,
    StaffDeactivateView,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')

@api_view(['GET'])
def setup_demo_data(request):
    """Temporary endpoint to seed demo data on fresh PostgreSQL deployment."""
    try:
        call_command('seed_demo_data')
        return Response({
            'status': 'success',
            'message': 'Demo data seeded! Admin: admin/adminpass | Staff: staff/staffpass',
        })
    except Exception as e:
        return Response({'status': 'error', 'detail': str(e)}, status=500)


@api_view(['GET'])
def clear_demo_products(request):
    """Temporary endpoint to delete all demo products from PostgreSQL."""
    from core.models import Product
    count, _ = Product.objects.all().delete()
    return Response({'status': 'success', 'message': f'Deleted {count} products from database.'})


urlpatterns = [
    path('health/', health_check, name='api-health-check'),
    path('setup/', setup_demo_data, name='setup-demo-data'),
    path('clear-products/', clear_demo_products, name='clear-demo-products'),
    path('auth/login/', LoginView.as_view(), name='api-login'),
    path('auth/request-otp/', RequestOTPView.as_view(), name='api-request-otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='api-verify-otp'),
    path('admin/staff/', StaffManagementView.as_view(), name='admin-staff-management'),
    path('admin/staff/<int:pk>/', StaffDeactivateView.as_view(), name='admin-staff-deactivate'),
    path('billing/lookup/', BillingLookupView.as_view(), name='billing-lookup'),
    path('billing/checkout/', CheckoutView.as_view(), name='billing-checkout'),
    path('customers/me/purchases/', CustomerPurchasesView.as_view(), name='customer-purchases'),
    path('predictions/near-expiry-risk/', ExpiryRiskPredictionView.as_view(), name='near-expiry-risk-predictions'),
    path('chatbot/recipe-suggestions/', RecipeSuggestionsView.as_view(), name='chatbot-recipe-suggestions'),
    path('chatbot/chat/', ChatbotConversationView.as_view(), name='chatbot-chat'),
    path('', include(router.urls)),
]



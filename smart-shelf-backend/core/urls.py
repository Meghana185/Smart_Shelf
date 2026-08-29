from django.urls import path, include
from rest_framework.routers import DefaultRouter
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

urlpatterns = [
    path('health/', health_check, name='api-health-check'),
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



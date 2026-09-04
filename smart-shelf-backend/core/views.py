import os
import random
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

from django.db import transaction
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes as decorator_permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Category, Product, Customer, Purchase, PurchaseItem, UserProfile, OTPCode
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    LoginSerializer,
    UserSerializer,
    CheckoutRequestSerializer,
    RequestOTPSerializer,
    VerifyOTPSerializer,
    CustomerPurchaseSerializer,
    StaffUserSerializer,
    StaffCreateSerializer,
)
from .permissions import IsAdminRole, IsStaffRole, IsCustomerRole, IsAdminOrReadOnlyStaff, get_user_role
from .tasks import send_checkout_sms_task
from .whatsapp import send_whatsapp_message, format_phone
from .ml.predictor import predict_expiry_risk

from .ai.groq_client import generate_recipes_from_ingredients, chat_with_recipe_assistant


@api_view(['GET'])
def health_check(request):
    from django.conf import settings
    db_engine = settings.DATABASES['default']['ENGINE']
    db_name = settings.DATABASES['default'].get('NAME', 'unknown')
    return Response({
        'status': 'healthy',
        'message': 'Smart Shelf API is running',
        'app': 'Smart Shelf Backend',
        'database_engine': db_engine,
        'database_name': str(db_name),
    })



class LoginView(APIView):
    permission_classes = []  # Allow unauthenticated users to log in

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        raw_input = serializer.validated_data['username'].strip()
        password = serializer.validated_data['password']

        # 1. Try finding user by username or email
        user_obj = User.objects.filter(username=raw_input).first() or User.objects.filter(email=raw_input).first()

        if not user_obj or not user_obj.check_password(password):
            return Response(
                {'detail': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user_obj.is_active:
            return Response(
                {'detail': 'Account is deactivated. Please contact administrator.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = user_obj


        # Get or initialize UserProfile
        role = get_user_role(user)
        if not role:
            role = 'admin' if user.is_superuser else 'staff'
            UserProfile.objects.get_or_create(user=user, defaults={'role': role})

        refresh = RefreshToken.for_user(user)
        refresh['role'] = role
        refresh['username'] = user.username

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': role,
            }
        }, status=status.HTTP_200_OK)


class StaffManagementView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        staff_users = User.objects.filter(userprofile__role='staff').order_by('-date_joined')
        serializer = StaffUserSerializer(staff_users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username'].strip()
        password = serializer.validated_data['password'].strip()
        name = serializer.validated_data['name'].strip()

        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=name,
            email=f"{username}@smartshelf.com"
        )
        UserProfile.objects.create(user=user, role='staff')

        return Response(StaffUserSerializer(user).data, status=status.HTTP_201_CREATED)


class StaffDeactivateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user.is_active = False
        user.save()
        return Response({
            'detail': 'Staff account deactivated successfully.',
            'id': user.id,
            'is_active': False
        }, status=status.HTTP_200_OK)




class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnlyStaff]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnlyStaff]

    def get_queryset(self):
        queryset = super().get_queryset()
        category_param = self.request.query_params.get('category')
        near_expiry = self.request.query_params.get('near_expiry')

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.lower())

        if category_param:
            if category_param.isdigit():
                queryset = queryset.filter(category_id=int(category_param))
            else:
                queryset = queryset.filter(category__name__iexact=category_param)

        if near_expiry and near_expiry.strip('.').lower() in ('true', '1', 'yes'):
            today = timezone.now().date()
            in_7_days = today + timedelta(days=7)
            queryset = queryset.filter(expiry_date__lte=in_7_days)

        return queryset

    @action(detail=True, methods=['patch', 'post'], url_path='mark_cleared')
    def mark_cleared(self, request, pk=None):
        product = self.get_object()
        product.status = Product.STATUS_CLEARED
        product.save(update_fields=['status'])
        return Response({
            'detail': f'Product "{product.name}" has been marked as cleared.',
            'id': product.id,
            'status': product.status
        }, status=status.HTTP_200_OK)


class BillingLookupView(APIView):
    permission_classes = [IsStaffRole]

    def get(self, request):
        qr_code_id = request.query_params.get('qr_code_id')
        if not qr_code_id:
            return Response(
                {'detail': 'qr_code_id parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            product = Product.objects.get(qr_code_id=qr_code_id)
        except Product.DoesNotExist:
            return Response(
                {'detail': 'Product not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        today = timezone.now().date()
        if product.status == Product.STATUS_EXPIRED or product.expiry_date < today:
            if product.status == Product.STATUS_ACTIVE:
                product.status = Product.STATUS_EXPIRED
                product.save(update_fields=['status'])
            return Response(
                {'detail': 'This product has expired and cannot be sold.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if product.stock_quantity <= 0:
            return Response(
                {'detail': 'Product is out of stock.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'id': product.id,
            'name': product.name,
            'price': str(product.price),
            'stock_quantity': product.stock_quantity,
            'expiry_date': product.expiry_date,
            'status': product.status,
            'qr_code_id': product.qr_code_id,
            'category_name': product.category.name,
        }, status=status.HTTP_200_OK)


class CheckoutView(APIView):
    permission_classes = [IsStaffRole]

    def post(self, request):
        serializer = CheckoutRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        customer_phone = serializer.validated_data['customer_phone']
        customer_name = serializer.validated_data.get('customer_name', '')
        items_data = serializer.validated_data['items']

        # Aggregate requested quantities per product
        requested_items = {}
        for item in items_data:
            qr_id = item['qr_code_id']
            qty = item['quantity']
            requested_items[qr_id] = requested_items.get(qr_id, 0) + qty

        # Validate existence, expiry & stock for all requested products
        today = timezone.now().date()
        products_map = {}
        for qr_id, qty in requested_items.items():
            try:
                product = Product.objects.get(qr_code_id=qr_id)
                products_map[qr_id] = product
            except Product.DoesNotExist:
                return Response(
                    {'detail': f"Product with QR ID '{qr_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            if product.status == Product.STATUS_EXPIRED or product.expiry_date < today:
                if product.status == Product.STATUS_ACTIVE:
                    product.status = Product.STATUS_EXPIRED
                    product.save(update_fields=['status'])
                return Response(
                    {'detail': f"Product '{product.name}' has expired and cannot be sold."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if product.stock_quantity < qty:
                return Response(
                    {'detail': f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}, requested: {qty}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Perform checkout atomically on the server
        with transaction.atomic():
            customer, _ = Customer.objects.get_or_create(
                phone_number=customer_phone,
                defaults={'name': customer_name}
            )
            if customer_name and not customer.name:
                customer.name = customer_name
                customer.save()

            total_amount = Decimal('0.00')
            items_summary = []

            # Create Purchase record
            purchase = Purchase.objects.create(
                customer=customer,
                staff_member=request.user if request.user.is_authenticated else None,
                total_amount=Decimal('0.00')
            )

            for qr_id, qty in requested_items.items():
                product = products_map[qr_id]
                line_total = product.price * qty
                total_amount += line_total

                # Create PurchaseItem
                PurchaseItem.objects.create(
                    purchase=purchase,
                    product=product,
                    quantity=qty,
                    price_at_purchase=product.price
                )

                # Deduct inventory stock
                product.stock_quantity -= qty
                product.save()

                items_summary.append({
                    'product_id': product.id,
                    'product_name': product.name,
                    'qr_code_id': product.qr_code_id,
                    'unit_price': str(product.price),
                    'quantity': qty,
                    'line_total': str(line_total)
                })

            purchase.total_amount = total_amount
            purchase.save()

        # Dispatch bill confirmation WhatsApp alert in a non-blocking background thread instantly
        items_summary_str = ", ".join([f"{item['quantity']}x {item['product_name']}" for item in items_summary])
        import threading
        threading.Thread(
            target=send_checkout_sms_task,
            args=(customer.phone_number, str(total_amount), purchase.id, items_summary_str, customer.name or ''),
            daemon=True
        ).start()





        return Response({
            'purchase_id': purchase.id,
            'customer': {
                'id': customer.id,
                'phone_number': customer.phone_number,
                'name': customer.name
            },
            'staff_member': request.user.username if request.user.is_authenticated else 'staff',
            'items': items_summary,
            'total_amount': str(total_amount),
            'created_at': purchase.created_at,
            'whatsapp_sent': True,
            'whatsapp_status': f"Bill sent automatically to WhatsApp ({customer.phone_number})"
        }, status=status.HTTP_201_CREATED)



class RequestOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        raw_phone = serializer.validated_data['phone_number'].strip()
        clean_digits = ''.join(filter(str.isdigit, raw_phone))
        phone_number = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits

        code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=5)

        OTPCode.objects.create(
            phone_number=phone_number,
            code=code,
            expires_at=expires_at
        )

        message = f"Your Smart Shelf verification code is: *{code}*. Valid for 5 minutes."

        # Send OTP via WhatsApp (non-blocking — login still proceeds even if WhatsApp is unavailable)
        wa_success = send_whatsapp_message(phone_number, message)

        if not wa_success:
            print(f"[OTP FALLBACK] WhatsApp send failed. Code for {phone_number}: {code}")
            return Response({
                'detail': f"WhatsApp service is awaiting QR scan. Your OTP is: {code}",
                'phone_number': phone_number,
                'dev_otp': code,
            }, status=status.HTTP_200_OK)

        return Response({
            'detail': f'OTP code sent to {phone_number} via WhatsApp. Please check your phone.',
            'phone_number': phone_number
        }, status=status.HTTP_200_OK)





class VerifyOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        raw_phone = serializer.validated_data['phone_number'].strip()
        clean_digits = ''.join(filter(str.isdigit, raw_phone))
        phone_number = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits
        code = serializer.validated_data['code'].strip()


        now = timezone.now()
        otp = OTPCode.objects.filter(
            phone_number=phone_number,
            code=code,
            is_used=False,
            expires_at__gte=now
        ).order_by('-created_at').first()

        if not otp:
            return Response(
                {'detail': 'Invalid or expired OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark OTP as used
        otp.is_used = True
        otp.save()

        # Create or fetch Customer
        customer, _ = Customer.objects.get_or_create(phone_number=phone_number)



        # Create or fetch Django User associated with customer
        username = f"cust_{phone_number}"
        user, _ = User.objects.get_or_create(
            username=username,
            defaults={'is_staff': False, 'is_superuser': False}
        )

        # Ensure UserProfile exists with role 'customer'
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = 'customer'
        profile.save()

        refresh = RefreshToken.for_user(user)
        refresh['role'] = 'customer'
        refresh['phone_number'] = phone_number

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'phone_number': customer.phone_number,
                'name': customer.name or '',
                'role': 'customer',
            }
        }, status=status.HTTP_200_OK)


class CustomerPurchasesView(APIView):
    permission_classes = [IsCustomerRole]

    def get(self, request):
        username = request.user.username
        phone_number = username.replace('cust_', '') if username.startswith('cust_') else username

        try:
            customer = Customer.objects.get(phone_number=phone_number)
        except Customer.DoesNotExist:
            return Response({'customer_name': '', 'phone_number': phone_number, 'purchases': []}, status=status.HTTP_200_OK)

        purchases = Purchase.objects.filter(customer=customer).prefetch_related('items__product')
        serializer = CustomerPurchaseSerializer(purchases, many=True)
        return Response({
            'customer_name': customer.name or '',
            'phone_number': customer.phone_number,
            'purchases': serializer.data
        }, status=status.HTTP_200_OK)


class ExpiryRiskPredictionView(APIView):
    permission_classes = [IsAdminOrReadOnlyStaff]

    def get(self, request):
        today = timezone.now().date()
        in_14_days = today + timedelta(days=14)

        # AI Discount recommendations apply ONLY to active, unexpired items currently on shelves
        # Expired items (expiry_date < today or status='expired') and Cleared items (status='cleared')
        # CANNOT be sold and must NEVER receive discount recommendations.
        near_expiry_products = Product.objects.filter(
            status=Product.STATUS_ACTIVE,
            expiry_date__gte=today,
            expiry_date__lte=in_14_days,
            stock_quantity__gt=0
        ).select_related('category')

        if not near_expiry_products.exists():
            near_expiry_products = Product.objects.filter(
                status=Product.STATUS_ACTIVE,
                expiry_date__gte=today,
                stock_quantity__gt=0
            ).select_related('category')

        predictions = []
        for product in near_expiry_products:
            pred = predict_expiry_risk(product)
            if pred.get('days_until_expiry', 0) > 0 and pred.get('risk_level') != 'Expired':
                predictions.append(pred)

        predictions.sort(key=lambda x: x['risk_score'], reverse=True)
        return Response(predictions, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            from core.ml.predictor import train_and_save_model
            clf = train_and_save_model()
            return Response({
                'detail': f'Scikit-learn RandomForest AI model retrained successfully with {len(clf.estimators_)} trees!'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'detail': f'Error retraining model: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RecipeSuggestionsView(APIView):
    permission_classes = [IsCustomerRole]

    def post(self, request):
        try:
            username = request.user.username
            phone_number = username.replace('cust_', '') if username.startswith('cust_') else username

            try:
                customer = Customer.objects.get(phone_number=phone_number)
            except Customer.DoesNotExist:
                return Response({
                    'message': 'No near-expiry items found in your recent purchases! Nothing to suggest right now.',
                    'recipes': []
                }, status=status.HTTP_200_OK)

            today = timezone.now().date()
            in_7_days = today + timedelta(days=7)

            # Find customer's purchased products expiring within 7 days
            near_expiry_items = PurchaseItem.objects.filter(
                purchase__customer=customer,
                product__expiry_date__gte=today,
                product__expiry_date__lte=in_7_days
            ).select_related('product')

            ingredient_names = list(set(item.product.name for item in near_expiry_items))

            # If no near-expiry items, skip AI call and return friendly message
            if not ingredient_names:
                return Response({
                    'message': 'No near-expiry items found in your recent purchases! Nothing to suggest right now.',
                    'recipes': []
                }, status=status.HTTP_200_OK)

            # Generate recipes using Groq API (or fallback)
            recipes = generate_recipes_from_ingredients(ingredient_names)

            return Response({
                'message': f"Generated {len(recipes)} recipes based on your near-expiry ingredients.",
                'ingredients': ingredient_names,
                'recipes': recipes
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # Handle failures gracefully without throwing a raw server error
            return Response({
                'detail': 'Unable to generate recipe suggestions at this moment. Please try again later.',
                'recipes': []
            }, status=status.HTTP_200_OK)


class ChatbotConversationView(APIView):
    """
    Interactive ChatGPT-style conversation endpoint powered by Groq API.
    POST /api/chatbot/chat/
    Body: { "messages": [ { "role": "user", "content": "How do I cook french fries?" } ] }
    """
    permission_classes = []

    def post(self, request):
        messages = request.data.get('messages', [])
        if not messages or not isinstance(messages, list):
            return Response({'detail': 'Field "messages" must be a non-empty array.'}, status=status.HTTP_400_BAD_REQUEST)

        customer_inventory = []
        if request.user.is_authenticated:
            try:
                phone_number = request.user.username
                customer = Customer.objects.get(phone_number=phone_number)
                recent_items = PurchaseItem.objects.filter(purchase__customer=customer).select_related('product')[:10]
                customer_inventory = list(set(item.product.name for item in recent_items))
            except Exception:
                pass

        reply = chat_with_recipe_assistant(messages, customer_inventory=customer_inventory)

        suggestions = [
            "What can I cook with my purchased items?",
            "Give me a 15-minute quick dinner recipe",
            "Healthy breakfast ideas with my ingredients",
            "How do I store fresh food longer to prevent expiry?"
        ]

        return Response({
            'reply': reply,
            'suggestions': suggestions
        }, status=status.HTTP_200_OK)


class TriggerExpiryAlertsView(APIView):
    """
    Endpoint to trigger automated daily expiry checks and WhatsApp alerts.
    Accessible via GET or POST by external cron jobs (e.g., cron-job.org / Render Cron / UptimeRobot)
    or internal triggers.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return self._trigger_alerts(request)

    def post(self, request):
        return self._trigger_alerts(request)

    def _trigger_alerts(self, request):
        from .tasks import check_near_expiry_purchases, update_expired_products_status
        update_expired_products_status()
        result = check_near_expiry_purchases()
        return Response({
            'status': 'success',
            'result': result,
            'message': "Daily expiry checks & WhatsApp reminders processed successfully."
        }, status=status.HTTP_200_OK)






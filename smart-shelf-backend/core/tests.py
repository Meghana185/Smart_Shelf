from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core.management import call_command
from django.urls import reverse

from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from .models import UserProfile, OTPCode, Category, Product, Customer, Purchase, PurchaseItem
from .tasks import check_near_expiry_purchases, send_checkout_sms_task


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class SmartShelfAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin User & Profile
        self.admin_user = User.objects.create_user(
            username='admin_test',
            password='adminpassword',
            email='admin@test.com'
        )
        UserProfile.objects.create(user=self.admin_user, role='admin')

        # Create Staff User & Profile
        self.staff_user = User.objects.create_user(
            username='staff_test',
            password='staffpassword',
            email='staff@test.com'
        )
        UserProfile.objects.create(user=self.staff_user, role='staff')

        # Obtain JWT tokens
        self.admin_token = self._get_jwt_token('admin_test', 'adminpassword')
        self.staff_token = self._get_jwt_token('staff_test', 'staffpassword')

        # Create category and test date
        self.category = Category.objects.create(name="Dairy")
        self.today = date.today()

    def _get_jwt_token(self, username, password):
        login_url = reverse('api-login')
        res = self.client.post(login_url, {'username': username, 'password': password}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return res.json()['access']

    def test_login_returns_jwt_with_role(self):
        login_url = reverse('api-login')

        # Admin login
        res_admin = self.client.post(login_url, {'username': 'admin_test', 'password': 'adminpassword'}, format='json')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(res_admin.json()['user']['role'], 'admin')

        # Staff login
        res_staff = self.client.post(login_url, {'username': 'staff_test', 'password': 'staffpassword'}, format='json')
        self.assertEqual(res_staff.status_code, status.HTTP_200_OK)
        self.assertEqual(res_staff.json()['user']['role'], 'staff')

    def test_invalid_credentials_returns_401(self):
        login_url = reverse('api-login')
        # Wrong password for existing user
        res = self.client.post(login_url, {'username': 'admin_test', 'password': 'wrongpassword'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', res.json())

        # Unknown username
        res_unknown = self.client.post(login_url, {'username': 'nonexistent_user', 'password': 'somepassword'}, format='json')
        self.assertEqual(res_unknown.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_staff_management_create_list_and_deactivate(self):
        staff_url = reverse('admin-staff-management')

        # 1. Staff user cannot access admin staff management -> 403 Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        res_unauth = self.client.get(staff_url)
        self.assertEqual(res_unauth.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Admin creates a new staff account -> 201 Created
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        create_payload = {
            "username": "new_staff_member",
            "password": "newstaffpass",
            "name": "New Staff Member"
        }
        res_create = self.client.post(staff_url, create_payload, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        created_id = res_create.json()['id']
        self.assertEqual(res_create.json()['username'], "new_staff_member")

        # 3. Admin lists staff accounts -> 200 OK
        res_list = self.client.get(staff_url)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        staff_usernames = [s['username'] for s in res_list.json()]
        self.assertIn("new_staff_member", staff_usernames)

        # 4. Newly created staff can log in -> lands on staff role (200 OK)
        login_url = reverse('api-login')
        res_login = self.client.post(login_url, {'username': 'new_staff_member', 'password': 'newstaffpass'}, format='json')
        self.assertEqual(res_login.status_code, status.HTTP_200_OK)
        self.assertEqual(res_login.json()['user']['role'], 'staff')

        # 5. Admin deactivates staff account -> 200 OK
        deactivate_url = reverse('admin-staff-deactivate', kwargs={'pk': created_id})
        res_deact = self.client.delete(deactivate_url)
        self.assertEqual(res_deact.status_code, status.HTTP_200_OK)

        # 6. Deactivated staff cannot log in -> 401 Unauthorized
        res_deact_login = self.client.post(login_url, {'username': 'new_staff_member', 'password': 'newstaffpass'}, format='json')
        self.assertEqual(res_deact_login.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('deactivated', res_deact_login.json()['detail'])


    def test_admin_can_create_product_staff_cannot(self):
        payload = {
            "name": "Fresh Milk",
            "category": self.category.id,
            "manufacturing_date": str(self.today - timedelta(days=2)),
            "expiry_date": str(self.today + timedelta(days=5)),
            "price": "3.50",
            "stock_quantity": 20,
        }
        url = reverse('product-list')

        # 1. Staff attempts to create product -> 403 Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        res_staff = self.client.post(url, payload, format='json')
        self.assertEqual(res_staff.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Admin creates product -> 201 Created
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        res_admin = self.client.post(url, payload, format='json')
        self.assertEqual(res_admin.status_code, status.HTTP_201_CREATED)

        data = res_admin.json()
        self.assertIn('qr_code_id', data)
        self.assertNotIn('qr_code_image', data)

        # 3. Both Admin and Staff can list products -> 200 OK
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        res_list = self.client.get(url)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.json()), 1)

    def test_expiry_date_validation(self):
        payload = {
            "name": "Expired Milk",
            "category": self.category.id,
            "manufacturing_date": str(self.today),
            "expiry_date": str(self.today - timedelta(days=1)),
            "price": "3.50",
            "stock_quantity": 5,
        }
        url = reverse('product-list')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expiry_date', response.json())

    def test_staff_can_checkout_admin_cannot(self):
        product = Product.objects.create(
            name="Cheddar Cheese",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=5),
            expiry_date=self.today + timedelta(days=20),
            price=Decimal("15.50"),
            stock_quantity=10,
        )

        checkout_url = reverse('billing-checkout')
        payload = {
            "customer_phone": "9876543210",
            "customer_name": "Test Customer",
            "items": [
                {"qr_code_id": product.qr_code_id, "quantity": 2}
            ]
        }

        # 1. Admin attempts checkout -> 403 Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        res_admin = self.client.post(checkout_url, payload, format='json')
        self.assertEqual(res_admin.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Staff completes checkout -> 201 Created
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        res_staff = self.client.post(checkout_url, payload, format='json')
        self.assertEqual(res_staff.status_code, status.HTTP_201_CREATED)

    @patch('core.views.send_checkout_sms_task')
    def test_checkout_reduces_stock_and_calculates_total(self, mock_checkout_sms):
        product1 = Product.objects.create(
            name="Butter",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=5),
            expiry_date=self.today + timedelta(days=10),
            price=Decimal("10.00"),
            stock_quantity=10,
        )
        product2 = Product.objects.create(
            name="Yogurt",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=2),
            expiry_date=self.today + timedelta(days=8),
            price=Decimal("5.50"),
            stock_quantity=8,
        )

        # Staff performs billing lookup
        lookup_url = reverse('billing-lookup') + f'?qr_code_id={product1.qr_code_id}'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        lookup_res = self.client.get(lookup_url)
        self.assertEqual(lookup_res.status_code, status.HTTP_200_OK)
        self.assertEqual(lookup_res.json()['name'], 'Butter')
        self.assertEqual(lookup_res.json()['stock_quantity'], 10)

        # Staff performs checkout for 3 Butter + 2 Yogurt
        checkout_url = reverse('billing-checkout')
        payload = {
            "customer_phone": "9998887770",
            "customer_name": "Jane Smith",
            "items": [
                {"qr_code_id": product1.qr_code_id, "quantity": 3},
                {"qr_code_id": product2.qr_code_id, "quantity": 2},
            ]
        }

        checkout_res = self.client.post(checkout_url, payload, format='json')
        self.assertEqual(checkout_res.status_code, status.HTTP_201_CREATED)

        bill_data = checkout_res.json()
        self.assertEqual(bill_data['total_amount'], "41.00")
        self.assertEqual(len(bill_data['items']), 2)

        product1.refresh_from_db()
        product2.refresh_from_db()
        self.assertEqual(product1.stock_quantity, 7)
        self.assertEqual(product2.stock_quantity, 6)

    @patch('core.views.send_whatsapp_message', return_value=True)
    def test_customer_otp_flow_and_purchases(self, mock_wa):
        phone = "5554443333"

        # 1. Request OTP
        req_otp_url = reverse('api-request-otp')
        req_res = self.client.post(req_otp_url, {"phone_number": phone}, format='json')
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)

        otp_record = OTPCode.objects.filter(phone_number=phone).order_by('-created_at').first()
        self.assertIsNotNone(otp_record)
        self.assertEqual(len(otp_record.code), 6)

        # 2. Verify with wrong code -> 400 Bad Request
        ver_otp_url = reverse('api-verify-otp')
        wrong_res = self.client.post(ver_otp_url, {"phone_number": phone, "code": "000000"}, format='json')
        self.assertEqual(wrong_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Verify with correct code -> 200 OK
        correct_res = self.client.post(ver_otp_url, {"phone_number": phone, "code": otp_record.code}, format='json')
        self.assertEqual(correct_res.status_code, status.HTTP_200_OK)

        cust_data = correct_res.json()
        self.assertEqual(cust_data['user']['role'], 'customer')
        customer_token = cust_data['access']

        # 4. Staff completes purchase for customer
        product = Product.objects.create(
            name="Organic Milk",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=1),
            expiry_date=self.today + timedelta(days=7),
            price=Decimal("4.25"),
            stock_quantity=15,
        )

        checkout_url = reverse('billing-checkout')
        checkout_payload = {
            "customer_phone": phone,
            "customer_name": "OTP Test Customer",
            "items": [
                {"qr_code_id": product.qr_code_id, "quantity": 2}
            ]
        }

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        chk_res = self.client.post(checkout_url, checkout_payload, format='json')
        self.assertEqual(chk_res.status_code, status.HTTP_201_CREATED)

        # 5. Customer fetches past purchases -> 200 OK
        purchases_url = reverse('customer-purchases')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {customer_token}')
        pur_res = self.client.get(purchases_url)
        self.assertEqual(pur_res.status_code, status.HTTP_200_OK)

        purchases_data = pur_res.json()
        self.assertEqual(len(purchases_data), 1)
        self.assertEqual(purchases_data[0]['total_amount'], "8.50")
        self.assertEqual(len(purchases_data[0]['items']), 1)
        self.assertEqual(purchases_data[0]['items'][0]['product_name'], "Organic Milk")
        self.assertEqual(purchases_data[0]['items'][0]['expiry_date'], str(self.today + timedelta(days=7)))

    def test_expired_otp_rejected(self):
        phone = "1112223333"
        expired_time = timezone.now() - timedelta(minutes=1)
        OTPCode.objects.create(
            phone_number=phone,
            code="123456",
            expires_at=expired_time
        )

        ver_otp_url = reverse('api-verify-otp')
        res = self.client.post(ver_otp_url, {"phone_number": phone, "code": "123456"}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('core.tasks.send_whatsapp_message')
    def test_near_expiry_celery_task_sends_sms_and_updates_flag(self, mock_send_sms):
        # Product expiring in 4 days (within 7 days)
        product_expiring_soon = Product.objects.create(
            name="Fresh Cream",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=3),
            expiry_date=self.today + timedelta(days=4),
            price=Decimal("5.00"),
            stock_quantity=10,
        )

        # Product expiring in 20 days (outside 7 days)
        product_expiring_later = Product.objects.create(
            name="Canned Beans",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=10),
            expiry_date=self.today + timedelta(days=20),
            price=Decimal("2.00"),
            stock_quantity=50,
        )

        customer = Customer.objects.create(phone_number="1234567890", name="SMS Recipient")

        purchase = Purchase.objects.create(customer=customer, total_amount=Decimal("12.00"))
        item1 = PurchaseItem.objects.create(
            purchase=purchase,
            product=product_expiring_soon,
            quantity=2,
            price_at_purchase=Decimal("5.00"),
            expiry_notification_sent=False
        )
        item2 = PurchaseItem.objects.create(
            purchase=purchase,
            product=product_expiring_later,
            quantity=1,
            price_at_purchase=Decimal("2.00"),
            expiry_notification_sent=False
        )

        # Run Celery near-expiry check task
        result = check_near_expiry_purchases()
        self.assertIn("1 near-expiry SMS alerts", result)

        # Verify send_sms was called for item1
        mock_send_sms.assert_called_once()
        called_phone, called_msg = mock_send_sms.call_args[0]
        self.assertEqual(called_phone, "1234567890")
        self.assertIn("Fresh Cream", called_msg)
        self.assertIn(str(self.today + timedelta(days=4)), called_msg)

        # Verify flag updated in database
        item1.refresh_from_db()
        item2.refresh_from_db()
        self.assertTrue(item1.expiry_notification_sent)
        self.assertFalse(item2.expiry_notification_sent)

    @patch('core.tasks.send_whatsapp_message')
    def test_checkout_triggers_sms_notification(self, mock_send_sms):

        product = Product.objects.create(
            name="Gouda Cheese",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=2),
            expiry_date=self.today + timedelta(days=15),
            price=Decimal("12.00"),
            stock_quantity=10,
        )

        checkout_url = reverse('billing-checkout')
        payload = {
            "customer_phone": "9876543210",
            "customer_name": "SMS Customer",
            "items": [
                {"qr_code_id": product.qr_code_id, "quantity": 1}
            ]
        }

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        res = self.client.post(checkout_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Verify send_sms was called for checkout bill confirmation
        mock_send_sms.assert_called()
        called_phone, called_msg = mock_send_sms.call_args[0]
        self.assertEqual(called_phone, "9876543210")
        self.assertIn("Thank you for shopping at Smart Shelf!", called_msg)
        self.assertIn("login/customer", called_msg)

    @patch("core.tasks.send_whatsapp_message")
    def test_check_near_expiry_purchases_sms_formatting(self, mock_send_sms):
        customer = Customer.objects.create(phone_number="9988776655", name="Expiry Customer")
        purchase = Purchase.objects.create(customer=customer, total_amount=Decimal("15.00"))

        p1 = Product.objects.create(
            name="Milk 1L",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=2),
            expiry_date=self.today + timedelta(days=3),
            price=Decimal("5.00"),
            stock_quantity=10,
        )
        PurchaseItem.objects.create(purchase=purchase, product=p1, quantity=1, price_at_purchase=Decimal("5.00"))

        p2 = Product.objects.create(
            name="Yogurt 200g",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=5),
            expiry_date=self.today,
            price=Decimal("3.00"),
            stock_quantity=5,
        )
        PurchaseItem.objects.create(purchase=purchase, product=p2, quantity=1, price_at_purchase=Decimal("3.00"))

        result = check_near_expiry_purchases()
        self.assertIn("Processed 2 near-expiry SMS alerts", result)

        self.assertEqual(mock_send_sms.call_count, 2)
        call1_msg = mock_send_sms.call_args_list[0][0][1]
        call2_msg = mock_send_sms.call_args_list[1][0][1]

        self.assertIn("Only 3 day(s) left!", call1_msg)
        self.assertIn("login/customer", call1_msg)
        self.assertIn("EXPIRES TODAY", call2_msg)
        self.assertIn("login/customer", call2_msg)


    def test_ai_expiry_prediction_and_retraining(self):
        # Create a test product near expiry
        product = Product.objects.create(
            name="Near Expiry Cheese",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=5),
            expiry_date=self.today + timedelta(days=5),
            price=Decimal("12.00"),
            stock_quantity=20,
        )

        # 1. Generate sales history via management command
        call_command('generate_sales_history')

        # 2. Retrain scikit-learn model via management command
        call_command('retrain_expiry_model')

        # 3. Call prediction API endpoint
        url = reverse('near-expiry-risk-predictions')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        res = self.client.get(url)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        predictions = res.json()
        self.assertIsInstance(predictions, list)
        self.assertGreater(len(predictions), 0)

        first_pred = predictions[0]
        self.assertEqual(first_pred['product_id'], product.id)
        self.assertIn('risk_score', first_pred)
        self.assertIn('risk_level', first_pred)
        self.assertIn('suggested_action', first_pred)
        self.assertIn(first_pred['suggested_action'], ['discount', 'feature it', 'just monitor'])

    @patch('core.views.generate_recipes_from_ingredients')
    def test_recipe_suggestions_customer_with_near_expiry_items(self, mock_generate_recipes):
        mock_generate_recipes.return_value = [
            {
                "title": "Creamy Pasta",
                "ingredients_used": ["Fresh Cream"],
                "steps": ["Boil pasta", "Mix cream", "Serve hot"]
            }
        ]

        # 1. Customer logs in
        phone = "7776665555"
        OTPCode.objects.create(phone_number=phone, code="112233", expires_at=timezone.now() + timedelta(minutes=5))
        ver_res = self.client.post(reverse('api-verify-otp'), {"phone_number": phone, "code": "112233"}, format='json')
        cust_token = ver_res.json()['access']

        # 2. Staff creates purchase for customer with product expiring in 3 days
        product = Product.objects.create(
            name="Fresh Cream",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=2),
            expiry_date=self.today + timedelta(days=3),
            price=Decimal("4.00"),
            stock_quantity=10,
        )
        customer = Customer.objects.get(phone_number=phone)
        purchase = Purchase.objects.create(customer=customer, total_amount=Decimal("4.00"))
        PurchaseItem.objects.create(purchase=purchase, product=product, quantity=1, price_at_purchase=Decimal("4.00"))

        # 3. Customer requests recipe suggestions
        url = reverse('chatbot-recipe-suggestions')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {cust_token}')
        res = self.client.post(url, {}, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('recipes', data)
        self.assertEqual(len(data['recipes']), 1)
        self.assertEqual(data['recipes'][0]['title'], "Creamy Pasta")
        mock_generate_recipes.assert_called_once()

    def test_recipe_suggestions_customer_with_no_near_expiry_items(self):
        phone = "8887776666"
        OTPCode.objects.create(phone_number=phone, code="445566", expires_at=timezone.now() + timedelta(minutes=5))
        ver_res = self.client.post(reverse('api-verify-otp'), {"phone_number": phone, "code": "445566"}, format='json')
        cust_token = ver_res.json()['access']

        # Customer has product expiring in 30 days (NOT near expiry)
        product = Product.objects.create(
            name="Far Expiry Rice",
            category=self.category,
            manufacturing_date=self.today - timedelta(days=5),
            expiry_date=self.today + timedelta(days=30),
            price=Decimal("10.00"),
            stock_quantity=20,
        )
        customer = Customer.objects.get(phone_number=phone)
        purchase = Purchase.objects.create(customer=customer, total_amount=Decimal("10.00"))
        PurchaseItem.objects.create(purchase=purchase, product=product, quantity=1, price_at_purchase=Decimal("10.00"))

        url = reverse('chatbot-recipe-suggestions')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {cust_token}')
        res = self.client.post(url, {}, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn("Nothing to suggest right now", data['message'])
        self.assertEqual(data['recipes'], [])

    @patch('core.tasks.send_whatsapp_message')
    @patch('core.views.send_whatsapp_message', return_value=True)
    @patch('core.views.generate_recipes_from_ingredients')
    def test_full_end_to_end_integration_flow(self, mock_recipes, mock_wa_views, mock_sms):
        mock_recipes.return_value = [{
            "title": "Fresh Milk & Butter Cake",
            "ingredients_used": ["Fresh Organic Milk"],
            "steps": ["Mix ingredients", "Bake at 180C for 25 mins"]
        }]

        # 1. Admin adds a new product
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        create_prod_res = self.client.post(reverse('product-list'), {
            "name": "Fresh Organic Milk",
            "category": self.category.id,
            "manufacturing_date": str(self.today - timedelta(days=2)),
            "expiry_date": str(self.today + timedelta(days=4)),
            "price": "3.50",
            "stock_quantity": 20,
        }, format='json')
        self.assertEqual(create_prod_res.status_code, status.HTTP_201_CREATED)
        product_data = create_prod_res.json()
        qr_code_id = product_data['qr_code_id']

        # 2. Staff scans/looks up product and bills a customer
        cust_phone = "9990001111"
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        
        lookup_res = self.client.get(f"{reverse('billing-lookup')}?qr_code_id={qr_code_id}")
        self.assertEqual(lookup_res.status_code, status.HTTP_200_OK)

        checkout_res = self.client.post(reverse('billing-checkout'), {
            "customer_phone": cust_phone,
            "customer_name": "Integration Tester",
            "items": [{"qr_code_id": qr_code_id, "quantity": 2}]
        }, format='json')
        self.assertEqual(checkout_res.status_code, status.HTTP_201_CREATED)

        # 3. Verify bill confirmation SMS sent to customer
        mock_sms.assert_called()

        # 4. Customer logs in via OTP
        req_otp_res = self.client.post(reverse('api-request-otp'), {"phone_number": cust_phone}, format='json')
        self.assertEqual(req_otp_res.status_code, status.HTTP_200_OK)

        otp_obj = OTPCode.objects.filter(phone_number=cust_phone).latest('created_at')
        ver_otp_res = self.client.post(reverse('api-verify-otp'), {"phone_number": cust_phone, "code": otp_obj.code}, format='json')
        self.assertEqual(ver_otp_res.status_code, status.HTTP_200_OK)
        cust_token = ver_otp_res.json()['access']

        # 5. Customer views purchase history
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {cust_token}')
        purchases_res = self.client.get(reverse('customer-purchases'))
        self.assertEqual(purchases_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(purchases_res.json()), 1)

        # 6. Celery near-expiry job flags item and sends SMS alert
        result = check_near_expiry_purchases()
        self.assertIn("SMS alerts", result)

        # 7. Customer asks AI chatbot for recipe suggestions using near-expiry item
        recipe_res = self.client.post(reverse('chatbot-recipe-suggestions'), {}, format='json')
        self.assertEqual(recipe_res.status_code, status.HTTP_200_OK)
        recipes = recipe_res.json()['recipes']
        self.assertEqual(len(recipes), 1)
        self.assertEqual(recipes[0]['title'], "Fresh Milk & Butter Cake")





from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth.models import User
from core.models import UserProfile, Category, Product, Customer, Purchase, PurchaseItem


class Command(BaseCommand):
    help = 'Seeds realistic demo data including Admin/Staff accounts, Categories, Products, Customers, Purchases, and trained ML risk model.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding Smart Shelf demo data...")

        # 1. Admin User
        admin_user, created = User.objects.get_or_create(username='admin', defaults={'email': 'admin@smartshelf.com'})
        if created:
            admin_user.set_password('adminpass')
            admin_user.save()
            UserProfile.objects.create(user=admin_user, role='admin')
            self.stdout.write(self.style.SUCCESS("Created Admin user: admin / adminpass"))
        else:
            self.stdout.write("Admin user 'admin' already exists.")

        # 2. Staff User
        staff_user, created = User.objects.get_or_create(username='staff', defaults={'email': 'staff@smartshelf.com'})
        if created:
            staff_user.set_password('staffpass')
            staff_user.save()
            UserProfile.objects.create(user=staff_user, role='staff')
            self.stdout.write(self.style.SUCCESS("Created Staff user: staff / staffpass"))
        else:
            self.stdout.write("Staff user 'staff' already exists.")

        # 3. Categories
        cat_names = ['Dairy', 'Bakery', 'Produce', 'Pantry', 'Meat & Seafood']
        categories = {}
        for cname in cat_names:
            cat, _ = Category.objects.get_or_create(name=cname)
            categories[cname] = cat
        self.stdout.write(self.style.SUCCESS(f"Ensured {len(categories)} categories exist."))

        today = date.today()

        # 4. Products
        demo_products = [
            {
                'name': 'Fresh Whole Milk 1L',
                'category': categories['Dairy'],
                'mfg_days': -3,
                'exp_days': 4,
                'price': '3.50',
                'stock': 25,
            },
            {
                'name': 'Whole Wheat Bread',
                'category': categories['Bakery'],
                'mfg_days': -2,
                'exp_days': 3,
                'price': '2.80',
                'stock': 15,
            },
            {
                'name': 'Aged Cheddar Cheese 200g',
                'category': categories['Dairy'],
                'mfg_days': -10,
                'exp_days': 5,
                'price': '5.20',
                'stock': 20,
            },
            {
                'name': 'Greek Yogurt 500g',
                'category': categories['Dairy'],
                'mfg_days': -5,
                'exp_days': 12,
                'price': '4.10',
                'stock': 30,
            },
            {
                'name': 'Organic Eggs 12pk',
                'category': categories['Dairy'],
                'mfg_days': -4,
                'exp_days': 16,
                'price': '4.99',
                'stock': 40,
            },
            {
                'name': 'Ripe Hass Avocados 4pk',
                'category': categories['Produce'],
                'mfg_days': -3,
                'exp_days': 2,
                'price': '3.99',
                'stock': 12,
            },
            {
                'name': 'Fresh Atlantic Salmon 300g',
                'category': categories['Meat & Seafood'],
                'mfg_days': -1,
                'exp_days': 3,
                'price': '9.99',
                'stock': 10,
            },
            {
                'name': 'Jasmine Rice 5kg',
                'category': categories['Pantry'],
                'mfg_days': -30,
                'exp_days': 180,
                'price': '14.50',
                'stock': 50,
            },
        ]

        created_products = []
        for pdata in demo_products:
            prod, p_created = Product.objects.get_or_create(
                name=pdata['name'],
                defaults={
                    'category': pdata['category'],
                    'manufacturing_date': today + timedelta(days=pdata['mfg_days']),
                    'expiry_date': today + timedelta(days=pdata['exp_days']),
                    'price': Decimal(pdata['price']),
                    'stock_quantity': pdata['stock'],
                }
            )
            created_products.append(prod)

        self.stdout.write(self.style.SUCCESS(f"Ensured {len(created_products)} demo products exist."))

        # 5. Customer & Purchases
        customer, _ = Customer.objects.get_or_create(
            phone_number="9876543210",
            defaults={'name': 'Alice Smith'}
        )

        if not Purchase.objects.filter(customer=customer).exists():
            p1 = created_products[0]  # Milk
            p2 = created_products[2]  # Cheese

            total_val = (p1.price * 2) + (p2.price * 1)
            purchase = Purchase.objects.create(
                customer=customer,
                staff_member=staff_user,
                total_amount=total_val
            )
            PurchaseItem.objects.create(purchase=purchase, product=p1, quantity=2, price_at_purchase=p1.price)
            PurchaseItem.objects.create(purchase=purchase, product=p2, quantity=1, price_at_purchase=p2.price)
            self.stdout.write(self.style.SUCCESS(f"Created demo Purchase #{purchase.id} for customer {customer.phone_number}"))

        # 6. Generate Sales History & Retrain ML Model
        self.stdout.write("Generating 30-day synthetic sales history...")
        call_command('generate_sales_history')

        self.stdout.write("Retraining scikit-learn RandomForest model...")
        call_command('retrain_expiry_model')

        self.stdout.write(self.style.SUCCESS("Demo data seeding complete! Ready for demonstration."))

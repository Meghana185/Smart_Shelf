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
        cat_names = ['Dairy', 'Bakery', 'Produce', 'Pantry', 'Meat & Seafood', 'Beverages', 'Snacks']
        categories = {}
        for cname in cat_names:
            cat, _ = Category.objects.get_or_create(name=cname)
            categories[cname] = cat
        self.stdout.write(self.style.SUCCESS(f"Ensured {len(categories)} categories exist."))

        self.stdout.write(self.style.SUCCESS("Demo data seeding complete! Ready for manual product entries."))

import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from core.models import Product, SalesHistory


class Command(BaseCommand):
    help = 'Generates 30 days of realistic synthetic sales history for existing products.'

    def handle(self, *args, **options):
        products = Product.objects.all()
        if not products.exists():
            self.stdout.write(self.style.WARNING("No products found in database. Create products first!"))
            return

        today = date.today()
        records_created = 0

        for product in products:
            # Determine base daily sales velocity based on price
            price_val = float(product.price)
            if price_val < 5.0:
                base_qty = random.randint(3, 8)
            elif price_val < 20.0:
                base_qty = random.randint(1, 4)
            else:
                base_qty = random.randint(0, 2)

            for day_offset in range(1, 31):
                sale_day = today - timedelta(days=day_offset)
                
                # Check if history already exists for this day
                if not SalesHistory.objects.filter(product=product, sale_date=sale_day).exists():
                    # Add small random variation per day
                    variation = random.choice([-1, 0, 1, 2])
                    qty = max(0, base_qty + variation)

                    if qty > 0:
                        SalesHistory.objects.create(
                            product=product,
                            quantity_sold=qty,
                            sale_date=sale_day
                        )
                        records_created += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully generated {records_created} synthetic sales history records across 30 days."))

import os
import time
import threading
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # Start a background daemon thread that periodically checks for near-expiry & expired items automatically
        def auto_expiry_scheduler():
            time.sleep(5)  # Initial delay after server boot
            while True:
                try:
                    from .tasks import check_near_expiry_purchases, update_expired_products_status
                    update_expired_products_status()
                    check_near_expiry_purchases()
                except Exception:
                    pass
                time.sleep(300)  # Automatically check every 5 minutes

        threading.Thread(target=auto_expiry_scheduler, daemon=True).start()

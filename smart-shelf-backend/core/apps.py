import os
import sys
import time
import threading
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # Avoid starting the background thread during management commands or test runs
        if any(cmd in sys.argv for cmd in ['test', 'makemigrations', 'migrate', 'collectstatic']):
            return

        # Start a background daemon thread that periodically checks for near-expiry items automatically
        def auto_expiry_scheduler():
            time.sleep(10)  # Initial delay after server boot
            while True:
                try:
                    from .tasks import check_near_expiry_purchases, update_expired_products_status
                    update_expired_products_status()
                    check_near_expiry_purchases()
                except Exception as e:
                    logger.warning(f"[AutoScheduler] Error during periodic expiry check: {e}")
                time.sleep(300)  # Check every 5 minutes

        thread = threading.Thread(target=auto_expiry_scheduler, daemon=True)
        thread.name = "SmartShelf-AutoExpiryScheduler"
        thread.start()


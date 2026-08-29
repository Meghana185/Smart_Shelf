from datetime import date, timedelta
import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from .models import PurchaseItem
from .whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)


@shared_task
def send_checkout_sms_task(customer_phone, total_amount, purchase_id, items_summary_str='', customer_name=''):
    """
    Sends an immediate bill confirmation WhatsApp message after checkout
    with a warm greeting, itemized summary & customer login link.
    """
    if not customer_phone:
        return

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')
    greeting = f"Hello {customer_name.strip()}! 👋" if customer_name and customer_name.strip() else "Hello! 👋"
    items_part = f"{items_summary_str}" if items_summary_str else f"Purchase #{purchase_id}"

    message = (
        f"{greeting}\n\n"
        f"Thank you for shopping at Smart Shelf! Here is your official purchase receipt:\n\n"
        f"🛒 *Items*: {items_part}\n"
        f"💰 *Total Paid*: ₹{total_amount}\n\n"
        f"📱 Track your purchases, get smart recipe suggestions, and view food expiry warnings anytime here:\n"
        f"{frontend_url}/login/customer"
    )
    send_whatsapp_message(customer_phone, message)


@shared_task
def check_near_expiry_purchases():
    """
    Automatic task that finds any purchased product expiring within 7 days OR ALREADY EXPIRED
    (that hasn't already been notified) and sends an automatic WhatsApp message to the customer.
    Marks expiry_notification_sent = True after sending so each item is notified once.
    """
    today = timezone.now().date()
    in_7_days = today + timedelta(days=7)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')

    # Find purchase items expiring within 7 days OR already expired that haven't been notified yet
    near_expiry_items = PurchaseItem.objects.filter(
        expiry_notification_sent=False,
        product__expiry_date__lte=in_7_days
    ).select_related('purchase__customer', 'product')

    notified_count = 0
    for item in near_expiry_items:
        customer_phone = item.purchase.customer.phone_number
        customer_name = item.purchase.customer.name or ''
        greeting = f"Hello {customer_name.strip()}! 👋" if customer_name and customer_name.strip() else "Hello! 👋"
        product_name = item.product.name
        expiry_date = item.product.expiry_date
        days_left = (expiry_date - today).days

        if days_left < 0:
            days_ago = abs(days_left)
            message = (
                f"{greeting}\n\n"
                f"⚠️ *EXPIRY NOTICE*: Your purchased item *{product_name}* has ALREADY EXPIRED ({days_ago} day(s) ago on {expiry_date})!\n\n"
                f"Please do not consume expired items. View your purchased items & fresh recipe suggestions here:\n"
                f"{frontend_url}/login/customer"
            )
        elif days_left == 0:
            message = (
                f"{greeting}\n\n"
                f"⏰ *EXPIRY ALERT*: Your purchased item *{product_name}* EXPIRES TODAY ({expiry_date})!\n\n"
                f"Use it today before it goes to waste — view your items & get recipe ideas here:\n"
                f"{frontend_url}/login/customer"
            )
        else:
            message = (
                f"{greeting}\n\n"
                f"⏰ *EXPIRY REMINDER*: Only {days_left} day(s) left! Your purchased item *{product_name}* expires on {expiry_date}.\n\n"
                f"Use it before it goes to waste — view your items & get recipe ideas here:\n"
                f"{frontend_url}/login/customer"
            )

        send_whatsapp_message(customer_phone, message)

        item.expiry_notification_sent = True
        item.save(update_fields=['expiry_notification_sent'])
        notified_count += 1

    logger.info(f"Processed {notified_count} automatic expiry/near-expiry WhatsApp notifications.")
    return f"Processed {notified_count} near-expiry SMS alerts."


@shared_task
def update_expired_products_status():
    """
    Finds all Products where expiry_date < today and status is 'active',
    and updates their status to 'expired'. Does NOT delete any product records.
    """
    from .models import Product
    today = timezone.now().date()
    expired_products = Product.objects.filter(
        expiry_date__lt=today,
        status=Product.STATUS_ACTIVE
    )
    count = expired_products.update(status=Product.STATUS_EXPIRED)
    if count > 0:
        logger.info(f"Automatically updated status to 'expired' for {count} products.")
    return f"Updated {count} expired products."

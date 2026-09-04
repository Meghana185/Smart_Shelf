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


from django.db.models import Q

@shared_task
def check_near_expiry_purchases():
    """
    Automatic daily task that finds any purchased product expiring within 7 days OR expired within the last 1 day
    (that hasn't already been notified TODAY) and sends an automatic daily WhatsApp reminder to the customer.
    Runs every day so customers get daily reminders at 7, 6, 5, 4, 3, 2, 1 days left and on expiry day.
    """
    today = timezone.now().date()
    in_7_days = today + timedelta(days=7)
    past_1_day = today - timedelta(days=1)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://smart-shelf-frontend-grxl.onrender.com')

    # Also update any expired products in inventory
    try:
        update_expired_products_status()
    except Exception as e:
        logger.warning(f"Failed to update expired products status: {e}")

    # Find purchase items expiring within 7 days (or expired yesterday) that haven't been notified today
    near_expiry_items = PurchaseItem.objects.filter(
        product__expiry_date__lte=in_7_days,
        product__expiry_date__gte=past_1_day
    ).filter(
        Q(last_expiry_notification_date__isnull=True) | Q(last_expiry_notification_date__lt=today)
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
                f"⚠️ *EXPIRY NOTICE*: Your purchased item *{product_name}* EXPIRED {days_ago} day(s) ago (on {expiry_date})!\n\n"
                f"Please do not consume expired items. View your purchased items & fresh recipe suggestions here:\n"
                f"{frontend_url}/login/customer"
            )
        elif days_left == 0:
            message = (
                f"{greeting}\n\n"
                f"🚨 *EXPIRY ALERT (EXPIRES TODAY)*: Your purchased item *{product_name}* EXPIRES TODAY ({expiry_date})!\n\n"
                f"Use it today before it goes to waste — view your items & get fresh recipe ideas here:\n"
                f"{frontend_url}/login/customer"
            )
        elif days_left == 1:
            message = (
                f"{greeting}\n\n"
                f"⏰ *URGENT EXPIRY REMINDER (1 DAY LEFT)*: Only 1 day left! Your purchased item *{product_name}* expires TOMORROW ({expiry_date}).\n\n"
                f"Use it before it goes to waste — view your items & get fresh recipe ideas here:\n"
                f"{frontend_url}/login/customer"
            )
        else:
            message = (
                f"{greeting}\n\n"
                f"⏰ *DAILY EXPIRY REMINDER ({days_left} DAYS LEFT)*: Only {days_left} days left! Your purchased item *{product_name}* expires on {expiry_date}.\n\n"
                f"Use it before it goes to waste — view your items & get fresh recipe ideas here:\n"
                f"{frontend_url}/login/customer"
            )

        send_whatsapp_message(customer_phone, message)

        item.last_expiry_notification_date = today
        item.expiry_notification_sent = True
        item.save(update_fields=['last_expiry_notification_date', 'expiry_notification_sent'])
        notified_count += 1

    logger.info(f"Processed {notified_count} automatic daily expiry WhatsApp notifications for {today}.")
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

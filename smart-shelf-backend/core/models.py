import uuid
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    ADMIN = 'admin'
    STAFF = 'staff'
    CUSTOMER = 'customer'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (STAFF, 'Staff'),
        (CUSTOMER, 'Customer'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='userprofile')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=STAFF)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class OTPCode(models.Model):
    phone_number = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.phone_number}: {self.code}"



class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_EXPIRED = 'expired'
    STATUS_CLEARED = 'cleared'
    STATUS_CHOICES = (
        (STATUS_ACTIVE, 'Active'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_CLEARED, 'Cleared'),
    )

    name = models.CharField(max_length=255)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    manufacturing_date = models.DateField()
    expiry_date = models.DateField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    qr_code_id = models.CharField(max_length=100, unique=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Customer(models.Model):
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name or 'Customer'} ({self.phone_number})"


class Purchase(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='purchases')
    staff_member = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_purchases')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Purchase #{self.id} - {self.customer.phone_number}"


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='purchase_items')
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    expiry_notification_sent = models.BooleanField(default=False)
    last_expiry_notification_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.quantity}x {self.product.name} (Purchase #{self.purchase.id})"


class SalesHistory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales_history')
    quantity_sold = models.PositiveIntegerField(default=1)
    sale_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sale_date']
        verbose_name_plural = "Sales Histories"

    def __str__(self):
        return f"{self.quantity_sold}x {self.product.name} on {self.sale_date}"


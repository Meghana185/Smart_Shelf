from django.contrib import admin
from .models import UserProfile, OTPCode, Category, Product, Customer, Purchase, PurchaseItem, SalesHistory

@admin.register(SalesHistory)
class SalesHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'quantity_sold', 'sale_date', 'created_at')
    list_filter = ('sale_date', 'product__category')
    search_fields = ('product__name',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')
    list_filter = ('role',)
    search_fields = ('user__username', 'user__email')


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'code', 'expires_at', 'is_used', 'created_at')
    search_fields = ('phone_number', 'code')
    list_filter = ('is_used', 'created_at')



@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'expiry_date', 'stock_quantity', 'price', 'qr_code_id')
    list_filter = ('category', 'expiry_date', 'created_at')
    search_fields = ('name', 'qr_code_id')
    readonly_fields = ('qr_code_id', 'created_at')


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'name', 'created_at')
    search_fields = ('phone_number', 'name')


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 1


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'total_amount', 'created_at', 'notified', 'staff_member')
    list_filter = ('notified', 'created_at')
    search_fields = ('customer__phone_number', 'customer__name')
    inlines = [PurchaseItemInline]


@admin.register(PurchaseItem)
class PurchaseItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'purchase', 'product', 'quantity', 'price_at_purchase', 'expiry_notification_sent')
    list_filter = ('expiry_notification_sent',)

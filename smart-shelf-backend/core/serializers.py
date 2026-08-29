import uuid
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile, Category, Product, Customer, Purchase, PurchaseItem


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role']


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']

    def get_role(self, obj):
        if obj.is_superuser:
            return 'admin'
        try:
            return obj.userprofile.role
        except Exception:
            return 'staff'


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class StaffUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name', read_only=True)
    date_created = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'is_active', 'date_created']


class StaffCreateSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(required=True, write_only=True)
    name = serializers.CharField(required=True, max_length=255)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value



class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)
    category_name = serializers.ReadOnlyField(source='category.name')
    new_category_name = serializers.CharField(required=False, write_only=True, allow_blank=True)
    total_sold = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'category',
            'category_name',
            'new_category_name',
            'manufacturing_date',
            'expiry_date',
            'price',
            'stock_quantity',
            'status',
            'total_sold',
            'qr_code_id',
            'created_at',
        ]
        read_only_fields = ['qr_code_id', 'created_at', 'total_sold']

    def get_total_sold(self, obj):
        from django.db.models import Sum
        purchase_sold = obj.purchase_items.aggregate(total=Sum('quantity'))['total'] or 0
        history_sold = obj.sales_history.aggregate(total=Sum('quantity_sold'))['total'] or 0
        return purchase_sold + history_sold


    def validate(self, attrs):
        mfg_date = attrs.get('manufacturing_date') or (self.instance.manufacturing_date if self.instance else None)
        exp_date = attrs.get('expiry_date') or (self.instance.expiry_date if self.instance else None)

        if mfg_date and exp_date and exp_date <= mfg_date:
            raise serializers.ValidationError({
                'expiry_date': 'Expiry date must be after manufacturing date.'
            })

        new_cat = attrs.get('new_category_name', '').strip()
        cat = attrs.get('category')

        if not cat and not new_cat:
            raise serializers.ValidationError({
                'category': 'Please select an existing category or enter a new category name.'
            })

        return attrs

    def create(self, validated_data):
        new_cat_name = validated_data.pop('new_category_name', '').strip()
        if new_cat_name:
            category_obj, _ = Category.objects.get_or_create(name=new_cat_name)
            validated_data['category'] = category_obj

        product = Product(**validated_data)
        if not product.qr_code_id:
            product.qr_code_id = str(uuid.uuid4())
        product.save()
        return product



class CheckoutItemSerializer(serializers.Serializer):
    qr_code_id = serializers.CharField(required=True)
    quantity = serializers.IntegerField(min_value=1, required=True)


class CheckoutRequestSerializer(serializers.Serializer):
    customer_phone = serializers.CharField(max_length=20, required=True)
    customer_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    items = CheckoutItemSerializer(many=True, required=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Items list cannot be empty.")
        return value


class RequestOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20, required=True)


class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20, required=True)
    code = serializers.CharField(max_length=6, min_length=6, required=True)


class CustomerPurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    expiry_date = serializers.ReadOnlyField(source='product.expiry_date')
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseItem
        fields = [
            'id',
            'product_id',
            'product_name',
            'expiry_date',
            'quantity',
            'price_at_purchase',
            'line_total',
        ]

    def get_line_total(self, obj):
        return str(obj.price_at_purchase * obj.quantity)


class CustomerPurchaseSerializer(serializers.ModelSerializer):
    items = CustomerPurchaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = ['id', 'total_amount', 'created_at', 'items']


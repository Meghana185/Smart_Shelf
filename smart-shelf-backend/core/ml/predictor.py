import os
import random
from pathlib import Path
from datetime import date, timedelta
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from django.db.models import Sum
from core.models import Product, SalesHistory

MODEL_DIR = Path(__file__).resolve().parent
MODEL_PATH = MODEL_DIR / 'expiry_model.joblib'


def calculate_sales_speed(product):
    """
    Calculates average daily sales quantity for a product over the last 30 days.
    Returns 0.0 if the product has no sales history yet.
    """
    thirty_days_ago = date.today() - timedelta(days=30)
    total_sales = SalesHistory.objects.filter(
        product=product,
        sale_date__gte=thirty_days_ago
    ).aggregate(total=Sum('quantity_sold'))['total']

    if total_sales is not None and total_sales > 0:
        return round(float(total_sales) / 30.0, 2)
    return 0.0  # Return 0.0 for unsold new products



def extract_features(product, today=None):
    """
    Extracts 5 viva-explainable features:
    1. days_until_expiry
    2. stock_quantity
    3. sales_speed
    4. price
    5. category_id
    """
    if today is None:
        today = date.today()

    days_until_expiry = max(0, (product.expiry_date - today).days)
    stock_quantity = product.stock_quantity
    sales_speed = calculate_sales_speed(product)
    price = float(product.price)
    category_id = product.category_id

    return [days_until_expiry, stock_quantity, sales_speed, price, category_id]


def generate_training_dataset():
    """
    Generates training samples from DB products and augmented synthetic scenarios
    to train a robust scikit-learn classifier.
    """
    X = []
    y = []

    today = date.today()
    products = Product.objects.all()

    # Real/DB product samples
    for product in products:
        features = extract_features(product, today)
        days_left, stock, speed, price, cat_id = features
        days_to_sellout = stock / (speed + 0.001)
        target = 1 if days_to_sellout > days_left else 0
        X.append(features)
        y.append(target)

    # Synthetic training data expansion (for small DBs)
    for _ in range(200):
        days_left = random.randint(1, 45)
        stock = random.randint(1, 100)
        speed = round(random.uniform(0.1, 5.0), 2)
        price = round(random.uniform(1.0, 50.0), 2)
        cat_id = random.randint(1, 5)

        days_to_sellout = stock / (speed + 0.001)
        target = 1 if days_to_sellout > days_left else 0

        X.append([days_left, stock, speed, price, cat_id])
        y.append(target)

    return np.array(X), np.array(y)


def train_and_save_model():
    """
    Trains RandomForestClassifier on product features and saves model to joblib file.
    """
    X, y = generate_training_dataset()

    clf = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
    clf.fit(X, y)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    return clf


def load_model():
    """
    Loads saved model from disk or trains if not found.
    """
    if os.path.exists(MODEL_PATH):
        try:
            return joblib.load(MODEL_PATH)
        except Exception:
            return train_and_save_model()
    else:
        return train_and_save_model()


def predict_expiry_risk(product):
    """
    Predicts near-expiry risk for a product.
    Returns:
    - risk_score: float (0.0 to 1.0)
    - risk_level: 'High' | 'Medium' | 'Low'
    - suggested_action: 'discount' | 'feature it' | 'just monitor'
    """
    model = load_model()
    features = extract_features(product)
    features_array = np.array([features])

    # Predict probability of expiring before sellout (class 1)
    probabilities = model.predict_proba(features_array)[0]
    classes = list(model.classes_)
    
    if 1 in classes:
        high_risk_index = classes.index(1)
        risk_score = float(probabilities[high_risk_index])
    else:
        risk_score = 0.0

    risk_score = round(risk_score, 2)

    days_left = (product.expiry_date - date.today()).days
    if product.status != Product.STATUS_ACTIVE or days_left <= 0:
        return {
            'product_id': product.id,
            'product_name': product.name,
            'category_name': product.category.name,
            'stock_quantity': product.stock_quantity,
            'days_until_expiry': max(0, days_left),
            'sales_speed': calculate_sales_speed(product),
            'price': str(product.price),
            'risk_score': 1.0,
            'risk_level': 'Expired',
            'suggested_action': 'discard / do not sell',
            'suggested_discount_percent': 0,
            'discounted_price': str(product.price),
        }

    # Determine risk level and suggested action
    if risk_score >= 0.70:
        risk_level = "High"
        suggested_action = "discount"
    elif risk_score >= 0.35:
        risk_level = "Medium"
        suggested_action = "feature it"
    else:
        risk_level = "Low"
        suggested_action = "just monitor"

    days_until_expiry = days_left
    sales_speed = calculate_sales_speed(product)

    # Calculate AI-suggested discount percentage & discounted price (only for items expiring within 7 days)
    if risk_level == "High":
        if days_until_expiry <= 3:
            discount_percent = 50
        elif days_until_expiry <= 7:
            discount_percent = 30
        else:
            discount_percent = 0
    else:
        discount_percent = 0

    original_price = float(product.price)
    discounted_price = round(original_price * (1.0 - (discount_percent / 100.0)), 2)

    return {
        'product_id': product.id,
        'product_name': product.name,
        'category_name': product.category.name,
        'stock_quantity': product.stock_quantity,
        'days_until_expiry': days_until_expiry,
        'sales_speed': sales_speed,
        'price': str(product.price),
        'risk_score': risk_score,
        'risk_level': risk_level,
        'suggested_action': suggested_action,
        'suggested_discount_percent': discount_percent,
        'discounted_price': f"{discounted_price:.2f}",
    }

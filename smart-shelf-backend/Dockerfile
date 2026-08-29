FROM python:3.12-slim

# Prevent Python from writing bytecode and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt gunicorn

# Copy backend codebase
COPY . /app/

# Expose Django port
EXPOSE 8000

# Default command runs migrations, seeds demo data, collects static files, and launches Gunicorn
CMD ["sh", "-c", "python manage.py migrate && python manage.py seed_demo_data && python manage.py collectstatic --noinput && gunicorn smartshelf.wsgi:application --bind 0.0.0.0:8000"]

"""
Project settings. Everything secret or machine-specific comes from the
.env file (see .env.example), so the same code runs on your laptop and
later on a real server with different values.
"""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes")


def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-insecure-key")
# Secure by default: if DJANGO_DEBUG is missing, we behave like production.
DEBUG = env_bool("DJANGO_DEBUG", False)
# In .env: DJANGO_ALLOWED_HOSTS=shop.example.com,www.shop.example.com
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost")
# Needed for HTTPS form posts (admin login, sandbox page): https://shop.example.com
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

INSTALLED_APPS = [
    "django.contrib.admin",        # the built-in admin site at /admin/
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework.authtoken",    # token login for the React admin page
    "corsheaders",
    # our apps
    "catalog",
    "orders",
    "payments",
    "chat",
    "contact",
    "accounts",
    "reviews",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # must be near the top
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ---- Database: MySQL ----
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("DB_NAME", "stridex"),
        "USER": os.getenv("DB_USER", "root"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "3306"),
        "OPTIONS": {"charset": "utf8mb4"},
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Colombo"
USE_TZ = True

STATIC_URL = "static/"
# Uploaded product photos live here (NOT in git). Served by Django only while DEBUG=True;
# in production a web server / storage service must serve MEDIA_URL (see Stage 6).
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

PASSWORD_RESET_TIMEOUT = 3600  # password-reset links stop working after 1 hour

STATIC_ROOT = BASE_DIR / "staticfiles"   # `collectstatic` gathers files here for production
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---- Django REST Framework ----
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    # The frontend expects prices as numbers (7500.0), not strings ("7500.00").
    "COERCE_DECIMAL_TO_STRING": False,
    # Throttling protects checkout from spam and (more importantly) stops
    # strangers from running up your LLM bill through the chat endpoint.
    "DEFAULT_THROTTLE_RATES": {"orders": "20/min", "chat": "15/min", "contact": "5/hour", "newsletter": "10/hour",
                               "auth": "20/hour", "reviews": "10/hour"},
}

# ---- CORS: let the React dev server call this API from another origin ----
CORS_ALLOWED_ORIGINS = list({FRONTEND_URL, "http://127.0.0.1:5173", *env_list("CORS_ALLOWED_ORIGINS")})

# ---- Payments ----
PAYMENT_MODE = os.getenv("PAYMENT_MODE", "sandbox")

# Unpaid online orders hold stock. After this many minutes the
# `cancel_stale_orders` command cancels them and puts the stock back.
PENDING_ORDER_TTL_MINUTES = int(os.getenv("PENDING_ORDER_TTL_MINUTES", "30"))

# ---- Email ----
# EMAIL_MODE=console  -> emails are PRINTED in the runserver terminal (default, for learning)
# EMAIL_MODE=smtp     -> really sent through your mail provider (fill the EMAIL_* values in .env)
SHOP_NAME = os.getenv("SHOP_NAME", "StrideX")
SHOP_ADMIN_EMAIL = os.getenv("SHOP_ADMIN_EMAIL", "")   # gets "new order" notices; also used as reply-to
if os.getenv("EMAIL_MODE", "console") == "smtp":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
    EMAIL_TIMEOUT = 10  # never let a slow mail server hang checkout for long
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL") or os.getenv("EMAIL_HOST_USER") or "shop@localhost"

# ---- LLM chat ----
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5")


# ---- Logging: print problems to the terminal / server log ----
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "{asctime} {levelname} {name}: {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "simple"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

# ---- Production safety (only enforced when DEBUG is False) ----
if not DEBUG:
    # Refuse to start with unsafe settings, instead of silently running insecurely.
    if len(SECRET_KEY) < 32 or SECRET_KEY.startswith(("change-me", "dev-only")):
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY to a long random value (32+ characters).")
    if PAYMENT_MODE == "sandbox" and not env_bool("ALLOW_SANDBOX_IN_PRODUCTION"):
        raise ImproperlyConfigured(
            "PAYMENT_MODE=sandbox lets anyone 'pay' for free. Use PAYMENT_MODE=live in production."
        )

    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)       # http -> https
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "3600"))  # raise to 31536000 once HTTPS works
    SECURE_CONTENT_TYPE_NOSNIFF = True
    if env_bool("BEHIND_PROXY"):  # set when a proxy (nginx, Render...) terminates HTTPS for you
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

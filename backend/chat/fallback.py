"""
Keyword fallback used when no ANTHROPIC_API_KEY is set (or the API is down),
so the chat widget always answers something. It's the Python version of the
old React chatbotEngine.js.
"""
import re

from catalog.models import Product
from catalog.serializers import ProductSerializer

CATEGORIES = {"shoes": "Shoes", "belts": "Belts", "wallets": "Wallets", "socks": "Socks", "care": "Shoe care"}


def _cards(products):
    return ProductSerializer(products, many=True).data


def reply(message):
    q = message.lower().strip()
    all_products = list(Product.objects.prefetch_related("sizes"))

    if re.match(r"^(hi|hello|hey)\b", q):
        return {"text": "Hey! I can check stock, prices, and point you to new drops or sales. What are you looking for?", "products": []}

    if re.search(r"\b(new|latest|just landed)\b", q):
        found = [p for p in all_products if (p.badge or "").lower() == "new"][:3]
        return {"text": "Here's what just dropped:" if found else "Nothing's tagged as new right now.", "products": _cards(found)}

    if re.search(r"\b(sale|discount|offer|cheap(er)?)\b", q):
        found = [p for p in all_products if p.sale_price is not None][:3]
        return {"text": "These are currently discounted:" if found else "Nothing's on sale right now, sorry!", "products": _cards(found)}

    for cat_id, label in CATEGORIES.items():
        if cat_id in q or label.lower() in q:
            found = [p for p in all_products if p.category == cat_id][:3]
            return {"text": f"Here's what we've got under {label}:", "products": _cards(found)}

    words = [w for w in q.split() if len(w) > 2]
    scored = sorted(
        ((sum(w in f"{p.brand} {p.name}".lower() for w in words), p) for p in all_products),
        key=lambda t: -t[0],
    )
    matches = [p for score, p in scored if score > 0][:3]

    if matches and re.search(r"\b(stock|available|availability)\b", q):
        p = matches[0]
        return {"text": f"{p.name}: {'in stock' if p.total_stock > 0 else 'out of stock'}.", "products": _cards([p])}
    if matches and re.search(r"\b(price|cost|how much)\b", q):
        p = matches[0]
        return {"text": f"{p.name} is {p.unit_price} LKR.", "products": _cards([p])}
    if matches:
        return {"text": "Here's what I found:", "products": _cards(matches)}

    return {"text": "I couldn't match that to a product — try naming a shoe or brand, or ask about new drops or sales.", "products": []}

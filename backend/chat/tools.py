"""
TOOLS the LLM can call. The model never sees your database directly — it can
only ask for these specific, read-only lookups, and WE run them. That keeps it
accurate (real stock/prices, not guesses) and safe (it can't change anything).
"""
from catalog.models import Product

TOOL_SCHEMAS = [
    {
        "name": "search_products",
        "description": (
            "Search the StrideX catalog. Use this to answer questions about what "
            "we sell, prices, sales, new arrivals, or stock. All filters are optional."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Words from the product name or brand, e.g. 'dunk' or 'new balance'"},
                "category": {"type": "string", "enum": ["shoes", "belts", "wallets", "socks", "care"]},
                "on_sale_only": {"type": "boolean"},
                "new_only": {"type": "boolean", "description": "Only products tagged as new drops"},
                "in_stock_only": {"type": "boolean"},
                "max_price": {"type": "number", "description": "Maximum price in LKR"},
            },
        },
    },
    {
        "name": "get_product",
        "description": "Get full details (price, sale price, per-size stock) for one product by its id.",
        "input_schema": {
            "type": "object",
            "properties": {"product_id": {"type": "string"}},
            "required": ["product_id"],
        },
    },
    {
        "name": "show_products",
        "description": (
            "Display product cards (image, price, link) to the customer in the chat. "
            "Call this with the ids of the 1-4 products most relevant to your answer."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"product_ids": {"type": "array", "items": {"type": "string"}, "maxItems": 4}},
            "required": ["product_ids"],
        },
    },
]


def describe(product):
    """Compact, model-friendly summary of a product."""
    sizes = list(product.sizes.all())
    in_stock_sizes = [s.size for s in sizes if s.stock > 0]
    total = sum(s.stock for s in sizes) if sizes else product.stock
    return {
        "id": product.slug,
        "name": product.name,
        "brand": product.brand,
        "category": product.category,
        "price_lkr": float(product.price),
        "sale_price_lkr": float(product.sale_price) if product.sale_price is not None else None,
        "badge": product.badge,
        "in_stock": total > 0,
        "units_in_stock": total,
        "sizes_in_stock": in_stock_sizes if sizes else None,
    }


def run_tool(name, args, shown_ids):
    """Execute one tool call; `shown_ids` collects the cards to display."""
    if name == "search_products":
        qs = Product.objects.prefetch_related("sizes")
        if args.get("category"):
            qs = qs.filter(category=args["category"])
        if args.get("on_sale_only"):
            qs = qs.filter(sale_price__isnull=False)
        if args.get("new_only"):
            qs = qs.filter(badge__iexact="new")
        if args.get("max_price") is not None:
            qs = qs.filter(price__lte=args["max_price"])
        results = [describe(p) for p in qs]
        for word in (args.get("query") or "").lower().split():
            results = [r for r in results if word in f"{r['brand']} {r['name']}".lower()]
        if args.get("in_stock_only"):
            results = [r for r in results if r["in_stock"]]
        return {"count": len(results), "products": results[:8]}

    if name == "get_product":
        product = Product.objects.prefetch_related("sizes").filter(slug=args.get("product_id")).first()
        return describe(product) if product else {"error": "No product with that id."}

    if name == "show_products":
        valid = set(Product.objects.filter(slug__in=args.get("product_ids", [])).values_list("slug", flat=True))
        for pid in args.get("product_ids", []):
            if pid in valid and pid not in shown_ids and len(shown_ids) < 4:
                shown_ids.append(pid)
        return {"shown": shown_ids}

    return {"error": f"Unknown tool {name}"}

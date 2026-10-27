import os
import io
import json
import urllib.request
import urllib.parse
import zipfile
import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from backend.scraper import scrape_yahoo_auction, normalize_auction_url, search_yahoo_auctions, fetch_paypay_live_sold, extract_main_flea_keyword
from backend.calculator import calculate_profit, suggest_prices, SHIPPING_METHODS, PLATFORM_FEES
from backend.templates_engine import (
    generate_flea_description,
    clean_yahoo_description,
    get_template_list,
    KEYWORD_PILLS
)
from backend.market_radar import (
    get_product_suggestions,
    calculate_sellability,
    TRENDING_PRODUCTS_CATALOG
)
from backend.db import (
    init_db,
    add_item,
    get_items,
    get_item,
    update_item,
    delete_item,
    get_stats,
    save_search_history,
    get_search_history,
    delete_search_history
)

app = FastAPI(title="Yahoo! Auction to Flea Market Reseller Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prevent browser caching of HTML and JS assets
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Initialize Database on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Request Models
class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 12
    sort: Optional[str] = "default"
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    category: Optional[str] = "all"

class AutoDealsRequest(BaseModel):
    category: Optional[str] = "all"
    max_budget: Optional[int] = None
    min_budget: Optional[int] = None
    min_profit: Optional[int] = 1000
    sort_by: Optional[str] = "profit"
    limit: Optional[int] = 16

class ScrapeRequest(BaseModel):
    url: str

class CalculateRequest(BaseModel):
    buy_price: int = 0
    inbound_shipping: int = 0
    sell_price: int = 0
    shipping_out: int = 210
    packaging_cost: int = 0
    platform: str = "yahoo_flea"
    custom_fee_rate: Optional[float] = None
    has_box: Optional[bool] = None

class FormatDescRequest(BaseModel):
    template_id: str = "standard"
    title: str = ""
    condition: str = ""
    description: str = ""

class ItemCreateRequest(BaseModel):
    auction_id: str = ""
    source_url: str = ""
    title: str
    images: List[str] = []
    buy_price: int = 0
    inbound_shipping: int = 0
    sell_price: int = 0
    shipping_out: int = 210
    packaging_cost: int = 0
    platform: str = "yahoo_flea"
    fee_rate: float = 0.05
    platform_fee: int = 0
    net_profit: int = 0
    profit_margin: float = 0.0
    condition: str = ""
    description: str = ""
    status: str = "watching"
    notes: str = ""

class ItemUpdateRequest(BaseModel):
    title: Optional[str] = None
    buy_price: Optional[int] = None
    inbound_shipping: Optional[int] = None
    sell_price: Optional[int] = None
    shipping_out: Optional[int] = None
    packaging_cost: Optional[int] = None
    platform: Optional[str] = None
    fee_rate: Optional[float] = None
    platform_fee: Optional[int] = None
    net_profit: Optional[int] = None
    profit_margin: Optional[float] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    images: Optional[List[str]] = None

class DownloadZipRequest(BaseModel):
    auction_id: str
    images: List[str]

class TranslateRequest(BaseModel):
    text: str
    target_lang: Optional[str] = "en"
    source_lang: Optional[str] = "auto"

class SellabilityRequest(BaseModel):
    query: str
    buy_price: Optional[int] = 0
    target_sell_price: Optional[int] = 0
    bids: Optional[int] = 0
    is_ending_soon: Optional[bool] = False

class ExtensionAnalyzeRequest(BaseModel):
    items: List[Dict[str, Any]] = []

# API Endpoints
@app.post("/api/search")
def api_search(req: SearchRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query is required")
    items = search_yahoo_auctions(
        query,
        limit=req.limit or 12,
        sort=req.sort or "default",
        min_price=req.min_price,
        max_price=req.max_price
    )
    
    # Enrich with real-time sellability metrics
    for item in items:
        item["sellability"] = calculate_sellability(
            query_or_title=item.get("title", ""),
            buy_price=item.get("buy_price", 0),
            target_sell_price=item.get("target_sell_price", 0),
            bids_count=item.get("bids", 0),
            is_ending_soon=item.get("is_ending_soon", False)
        )

    try:
        save_search_history(query, len(items))
    except Exception as e:
        print(f"Error saving search history: {e}")
    return {
        "query": query,
        "count": len(items),
        "items": items,
        "min_price": req.min_price,
        "max_price": req.max_price
    }

@app.get("/api/category-insights")
def api_category_insights(budget: Optional[int] = None):
    from backend.market_radar import get_category_profit_insights, get_budget_recommendations
    return {
        "categories": get_category_profit_insights(),
        "budget_advice": get_budget_recommendations(budget)
    }

@app.post("/api/extension/analyze-items")
def api_extension_analyze_items(req: ExtensionAnalyzeRequest):
    """
    Blazing-fast Helium 10 style batch analyzer for the Chrome Extension.
    Evaluates up to 50 Yahoo Auction items extracted directly from the user's active page,
    calculates real Flea Market targets, net profits, box & junk conditions.
    """
    from backend.market_radar import get_flea_market_real_sold_stats, calculate_sellability
    from backend.scraper import analyze_condition_and_defects, extract_main_flea_keyword
    import urllib.parse

    analyzed_items = []
    for it in req.items[:50]:
        title = it.get("title", "")
        auc_id = it.get("auction_id") or it.get("auctionId", "")
        price = int(it.get("price", 0))
        shipping = int(it.get("shipping_fee", 0) or it.get("shippingFee", 0))
        img = it.get("image", "") or it.get("imageUrl", "")
        bids = int(it.get("bids", 0) or it.get("bidCount", 0))
        left_sec = it.get("left_seconds") or it.get("leftTime")
        is_ending_soon = bool(left_sec is not None and 0 < float(left_sec) < 7200)

        cond_meta = analyze_condition_and_defects(title=title)
        clean_kw = extract_main_flea_keyword(title)

        # Real Flea Market Target
        flea_stats = get_flea_market_real_sold_stats(title, max_pages=1)
        target_sell = flea_stats.get("avg_sold_price", 0) if (flea_stats and flea_stats.get("avg_sold_price", 0) > 0) else 0

        if target_sell > 0:
            if cond_meta["junk"]["is_junk"]:
                target_sell = max(round(target_sell * 0.30), 500)
            elif cond_meta["box"]["has_box"] is True:
                target_sell = round(target_sell * 1.05)
            elif cond_meta["box"]["has_box"] is False:
                target_sell = round(target_sell * 0.95)

            total_cost = price + shipping
            fee = round(target_sell * 0.05)
            t_low = title.lower()
            ship_out = 750 if any(k in t_low for k in ['laptop', 'ノートpc', 'ノートパソコン', 'パソコン', 'pc', '15.6', '13.3', '14.0', 'ps5', 'ps4']) else 210
            net_profit = target_sell - total_cost - fee - ship_out
            margin = round((net_profit / target_sell) * 100, 1) if target_sell > 0 else 0.0
            is_profitable = bool(net_profit >= 1000 and not cond_meta["junk"]["is_junk"])
        else:
            net_profit = None
            margin = 0.0
            is_profitable = False

        sellability = calculate_sellability(
            query_or_title=title,
            buy_price=price,
            target_sell_price=target_sell,
            bids_count=bids,
            is_ending_soon=is_ending_soon
        )

        analyzed_items.append({
            "auction_id": auc_id,
            "title": title,
            "clean_title": clean_kw,
            "buy_price": price,
            "shipping_fee": shipping,
            "total_procurement": price + shipping,
            "target_sell_price": target_sell,
            "estimated_profit": net_profit,
            "profit_margin": margin,
            "is_profitable": is_profitable,
            "has_box": cond_meta["box"]["has_box"],
            "box_badge": cond_meta["box"]["badge_text"],
            "is_junk": cond_meta["junk"]["is_junk"],
            "junk_reasons": cond_meta["junk"]["reasons"],
            "has_damage": cond_meta["has_damage"],
            "image": img,
            "bids": bids,
            "sellability": sellability,
            "paypay_search_url": f"https://paypayfleamarket.yahoo.co.jp/search/{urllib.parse.quote(clean_kw)}?sold=1"
        })

    return {
        "success": True,
        "count": len(analyzed_items),
        "profitable_count": sum(1 for x in analyzed_items if x.get("is_profitable")),
        "items": analyzed_items
    }

@app.post("/api/auto-deals")
def api_auto_deals(req: AutoDealsRequest):
    from backend.market_radar import find_profitable_deals
    result = find_profitable_deals(
        category=req.category or "all",
        max_budget=req.max_budget,
        min_budget=req.min_budget,
        min_profit=req.min_profit or 1000,
        sort_by=req.sort_by or "profit",
        limit=req.limit or 16
    )
    return result

@app.post("/api/scrape")
def api_scrape(req: ScrapeRequest):
    if not req.url.strip():
        raise HTTPException(status_code=400, detail="Please enter a valid Yahoo! Auction URL or Auction ID")
    
    result = scrape_yahoo_auction(req.url)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to retrieve auction details"))
    
    # Generate initial suggested flea market description (English standard)
    formatted_desc = generate_flea_description(
        "standard_en",
        result.get("title", ""),
        result.get("condition", ""),
        result.get("description", "")
    )
    result["formatted_description"] = formatted_desc

    # Generate initial price suggestion with box awareness
    buy_price = result.get("buy_price", 0)
    inbound = result.get("estimated_inbound_shipping", 0)
    has_box = result.get("has_box")
    suggestions = suggest_prices(
        buy_price=buy_price,
        inbound_shipping=inbound,
        shipping_out=210,
        platform="yahoo_flea",
        has_box=has_box
    )
    result["suggestions"] = suggestions

    # Compute 'Will It Sell?' sellability score and turnover verdict
    target_sell = suggestions.get("suggested_target_3000", {}).get("sell_price", 0)
    result["sellability"] = calculate_sellability(
        query_or_title=result.get("title", ""),
        buy_price=buy_price,
        target_sell_price=target_sell,
        bids_count=result.get("bids", 0),
        is_ending_soon=result.get("is_ending_soon", False)
    )

    # Fetch live completed sold listings directly from PayPay Flea Market
    try:
        result["live_flea_sold"] = fetch_paypay_live_sold(result.get("title", ""), limit=6)
    except Exception:
        result["live_flea_sold"] = []

    return result

@app.post("/api/translate")
def api_translate(req: TranslateRequest):
    text = req.text.strip()
    if not text:
        return {"translated": ""}
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={req.source_lang or 'auto'}&tl={req.target_lang or 'en'}&dt=t&q=" + urllib.parse.quote(text)
        req_obj = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req_obj, timeout=8) as res:
            data = json.loads(res.read().decode("utf-8"))
            translated = "".join([part[0] for part in data[0] if part[0]])
            return {"translated": translated}
    except Exception as e:
        return {"translated": text, "error": str(e)}

@app.post("/api/calculate")
def api_calculate(req: CalculateRequest):
    calc = calculate_profit(
        buy_price=req.buy_price,
        inbound_shipping=req.inbound_shipping,
        sell_price=req.sell_price,
        shipping_out=req.shipping_out,
        packaging_cost=req.packaging_cost,
        platform=req.platform,
        custom_fee_rate=req.custom_fee_rate
    )
    suggestions = suggest_prices(
        buy_price=req.buy_price,
        inbound_shipping=req.inbound_shipping,
        shipping_out=req.shipping_out,
        packaging_cost=req.packaging_cost,
        platform=req.platform,
        custom_fee_rate=req.custom_fee_rate,
        has_box=req.has_box
    )
    return {
        "calc": calc,
        "suggestions": suggestions
    }

@app.post("/api/format-description")
def api_format_desc(req: FormatDescRequest):
    formatted = generate_flea_description(
        req.template_id,
        req.title,
        req.condition,
        req.description
    )
    return {"formatted": formatted}

@app.get("/api/suggestions")
def api_get_suggestions(category: Optional[str] = "all"):
    return {
        "category": category,
        "items": get_product_suggestions(category)
    }

@app.get("/api/flea-sold")
def api_get_flea_sold(query: str, limit: Optional[int] = 6):
    q = query.strip()
    if not q:
        return {"query": "", "items": [], "stats": {}}
    from backend.market_radar import get_flea_market_real_sold_stats
    clean_q = extract_main_flea_keyword(q) or q
    stats = get_flea_market_real_sold_stats(clean_q, max_pages=2)
    items = fetch_paypay_live_sold(clean_q, limit=limit or 6)
    return {
        "query": q,
        "clean_query": clean_q,
        "stats": stats,
        "count": len(items),
        "items": items
    }

@app.post("/api/sellability")
def api_check_sellability(req: SellabilityRequest):
    result = calculate_sellability(
        query_or_title=req.query,
        buy_price=req.buy_price or 0,
        target_sell_price=req.target_sell_price or 0,
        bids_count=req.bids or 0,
        is_ending_soon=req.is_ending_soon or False
    )
    return result

@app.get("/api/meta")
def api_meta():
    return {
        "shipping_methods": SHIPPING_METHODS,
        "platforms": PLATFORM_FEES,
        "templates": get_template_list(),
        "keyword_pills": KEYWORD_PILLS,
        "search_history": get_search_history(limit=12),
        "suggestions_count": len(TRENDING_PRODUCTS_CATALOG)
    }

@app.get("/api/search-history")
def api_get_search_history():
    return get_search_history(limit=15)

@app.delete("/api/search-history")
def api_delete_search_history(query: Optional[str] = None):
    delete_search_history(query)
    return {"success": True}

@app.get("/api/items")
def api_get_items(status: Optional[str] = "all", search: Optional[str] = None):
    return get_items(status=status, search=search)

@app.post("/api/items")
def api_create_item(req: ItemCreateRequest):
    # Recalculate profit to ensure accuracy before saving
    calc = calculate_profit(
        buy_price=req.buy_price,
        inbound_shipping=req.inbound_shipping,
        sell_price=req.sell_price,
        shipping_out=req.shipping_out,
        packaging_cost=req.packaging_cost,
        platform=req.platform
    )
    data = req.model_dump()
    data["platform_fee"] = calc["platform_fee"]
    data["net_profit"] = calc["net_profit"]
    data["profit_margin"] = calc["profit_margin"]
    data["fee_rate"] = calc["fee_rate"]

    item_id = add_item(data)
    return {"id": item_id, "success": True}

@app.get("/api/items/{item_id}")
def api_get_item(item_id: int):
    item = get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Product not found in inventory")
    return item

@app.put("/api/items/{item_id}")
def api_update_item(item_id: int, req: ItemUpdateRequest):
    existing = get_item(item_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found in inventory")
    
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    
    # Recalculate profit if any financial numbers changed
    buy_price = update_data.get("buy_price", existing["buy_price"])
    inbound_shipping = update_data.get("inbound_shipping", existing["inbound_shipping"])
    sell_price = update_data.get("sell_price", existing["sell_price"])
    shipping_out = update_data.get("shipping_out", existing["shipping_out"])
    packaging_cost = update_data.get("packaging_cost", existing["packaging_cost"])
    platform = update_data.get("platform", existing["platform"])

    calc = calculate_profit(
        buy_price=buy_price,
        inbound_shipping=inbound_shipping,
        sell_price=sell_price,
        shipping_out=shipping_out,
        packaging_cost=packaging_cost,
        platform=platform
    )
    update_data["platform_fee"] = calc["platform_fee"]
    update_data["net_profit"] = calc["net_profit"]
    update_data["profit_margin"] = calc["profit_margin"]
    update_data["fee_rate"] = calc["fee_rate"]

    success = update_item(item_id, update_data)
    return {"success": success}

@app.delete("/api/items/{item_id}")
def api_delete_item(item_id: int):
    success = delete_item(item_id)
    return {"success": success}

@app.get("/api/stats")
def api_get_stats():
    return get_stats()

@app.post("/api/download-zip")
def api_download_zip(req: DownloadZipRequest):
    """Downloads all product images and bundles them in an in-memory ZIP archive."""
    if not req.images:
        raise HTTPException(status_code=400, detail="画像URLがありません")

    zip_buffer = io.BytesIO()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://auctions.yahoo.co.jp/"
    }

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for index, img_url in enumerate(req.images):
            try:
                res = requests.get(img_url, headers=headers, timeout=8)
                if res.status_code == 200:
                    filename = f"image_{index+1:02d}.jpg"
                    zip_file.writestr(filename, res.content)
            except Exception:
                continue

    zip_buffer.seek(0)
    safe_id = req.auction_id or "yahoo_images"
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_id}_photos.zip"'}
    )

# Static files for frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

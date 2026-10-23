import re
import json
import requests
from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
]

def extract_auction_id(input_str: str) -> Optional[str]:
    """Extract auction ID from input string (URL or direct ID)."""
    input_str = input_str.strip()
    # Check for direct auction ID like 'c1246060178' or '1247155578'
    match = re.search(r'auction/([a-zA-Z0-9]+)', input_str)
    if match:
        return match.group(1)
    
    # If the user pasted just an ID
    if re.match(r'^[a-zA-Z0-9]{8,15}$', input_str):
        return input_str
        
    return None

def normalize_auction_url(input_str: str) -> str:
    """Normalize to a standard Yahoo Auctions URL."""
    auc_id = extract_auction_id(input_str)
    if auc_id:
        return f"https://page.auctions.yahoo.co.jp/jp/auction/{auc_id}"
    if input_str.startswith("http://") or input_str.startswith("https://"):
        return input_str
    return f"https://page.auctions.yahoo.co.jp/jp/auction/{input_str}"

def scrape_yahoo_auction(url_or_id: str) -> Dict[str, Any]:
    """
    Scrapes a Yahoo Auction page and returns structured details.
    """
    target_url = normalize_auction_url(url_or_id)
    auc_id = extract_auction_id(url_or_id) or "unknown"
    
    headers = {
        "User-Agent": USER_AGENTS[0],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
        "Referer": "https://auctions.yahoo.co.jp/"
    }

    try:
        response = requests.get(target_url, headers=headers, timeout=12)
        response.encoding = response.apparent_encoding or "utf-8"
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Could not retrieve page from Yahoo! Auctions (Status: {response.status_code})",
                "auction_id": auc_id,
                "url": target_url
            }
        
        html = response.text
        soup = BeautifulSoup(html, "html.parser")
        
        # Parse __NEXT_DATA__ for rich auction info (time, bids, leftTime, shipping)
        item_detail = {}
        next_data_match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
        if next_data_match:
            try:
                page_json = json.loads(next_data_match.group(1))
                props = page_json.get("props", {}).get("pageProps", {})
                item_wrap = props.get("initialState", {}).get("item", {}) or props.get("item", {})
                item_detail = item_wrap.get("detail", {}).get("item", {}) if isinstance(item_wrap, dict) else {}
            except Exception:
                item_detail = {}
        
        # 1. Parse JSON-LD if available
        json_ld_data = None
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                if isinstance(data, dict) and (data.get("@type") == "Product" or "offers" in data or "name" in data):
                    json_ld_data = data
                    break
            except Exception:
                continue

        # Extract title
        title = ""
        if json_ld_data and json_ld_data.get("name"):
            title = json_ld_data.get("name", "").strip()
        
        if not title:
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                t = og_title["content"].strip()
                t = re.sub(r'\s*-\s*Yahoo!.*$', '', t)
                title = t
                
        if not title:
            h1 = soup.find("h1")
            if h1:
                title = h1.get_text().strip()

        # Extract price (落札価格 / 現在価格 / 即決価格)
        buy_price = 0
        if json_ld_data and "offers" in json_ld_data:
            offers = json_ld_data["offers"]
            if isinstance(offers, dict) and "price" in offers:
                try:
                    buy_price = int(float(offers["price"]))
                except Exception:
                    pass
            elif isinstance(offers, list) and len(offers) > 0:
                try:
                    buy_price = int(float(offers[0].get("price", 0)))
                except Exception:
                    pass

        if buy_price == 0:
            # Try finding price text in page
            price_match = re.search(r'([0-9]{1,3}(?:,[0-9]{3})*)\s*円', html)
            if price_match:
                try:
                    buy_price = int(price_match.group(1).replace(",", ""))
                except Exception:
                    buy_price = 0

        # Extract buy-it-now price if present (即決価格)
        buy_it_now_price = 0
        buy_it_now_match = re.search(r'即決(?:価格)?\s*[:：]?\s*([0-9]{1,3}(?:,[0-9]{3})*)\s*円', html)
        if buy_it_now_match:
            try:
                buy_it_now_price = int(buy_it_now_match.group(1).replace(",", ""))
            except Exception:
                pass

        # Extract description
        description = ""
        if json_ld_data and json_ld_data.get("description"):
            description = json_ld_data.get("description", "").strip()
        
        if not description:
            # Common description container classes/IDs on Yahoo Auctions
            desc_el = soup.find(id="ProductExplanation") or soup.find(class_=re.compile(r"ProductExplanation|Explanation"))
            if desc_el:
                description = desc_el.get_text("\n").strip()
        
        if not description:
            og_desc = soup.find("meta", property="og:description")
            if og_desc and og_desc.get("content"):
                description = og_desc["content"].strip()

        # Extract condition (状態)
        condition = "目立った傷や汚れなし"
        condition_patterns = [
            ("新品、未使用", ["新品、未使用", "未使用品", "NEW", "新品"]),
            ("未使用に近い", ["未使用に近い", "極美品", "試着のみ"]),
            ("目立った傷や汚れなし", ["目立った傷や汚れなし", "美品", "中古美品"]),
            ("やや傷や汚れあり", ["やや傷や汚れあり", "通常の中古品"]),
            ("傷や汚れあり", ["傷や汚れあり", "使用感あり"]),
            ("全体的に状態が悪い", ["全体的に状態が悪い", "ジャンク", "故障品", "部品取り"])
        ]
        
        found_condition = False
        for standard_cond, keywords in condition_patterns:
            for kw in keywords:
                if kw in html[:15000]:  # check within header/item info area
                    condition = standard_cond
                    found_condition = True
                    break
            if found_condition:
                break

        # Extract shipping conditions (送料負担 & 送料金額)
        shipping_buyer_pays = True
        estimated_inbound_shipping = 0
        shipping_text = "落札者負担"
        shipping_method_name = ""

        charge_for_shipping = item_detail.get("chargeForShipping") if isinstance(item_detail, dict) else ""
        if charge_for_shipping == "seller" or "送料無料" in html or "出品者負担" in html or "出品者が負担" in html:
            shipping_buyer_pays = False
            shipping_text = "出品者負担 (送料無料)"
            estimated_inbound_shipping = 0
        else:
            shipping_buyer_pays = True
            # Extract shipping fee from structured Next.js methods
            shipping_info = item_detail.get("shipping", {}) if isinstance(item_detail, dict) else {}
            methods = shipping_info.get("methods", []) if isinstance(shipping_info, dict) else []
            fees = []
            for m in methods:
                fee = m.get("shippingFee")
                if fee is not None:
                    try:
                        fees.append(int(fee))
                        if not shipping_method_name:
                            shipping_method_name = m.get("name", "")
                    except Exception:
                        pass
            if fees:
                estimated_inbound_shipping = min(fees)
            
            # Fallback regex if structured method fee was not found
            if estimated_inbound_shipping == 0:
                ship_match = re.search(r'送料[^\d]{0,35}([0-9]{1,3}(?:,[0-9]{3})*)\s*円', html)
                if ship_match:
                    try:
                        estimated_inbound_shipping = int(ship_match.group(1).replace(",", ""))
                    except Exception:
                        estimated_inbound_shipping = 0

            if estimated_inbound_shipping > 0:
                shipping_text = f"落札者負担 (+¥{estimated_inbound_shipping:,})"
            else:
                shipping_text = "落札者負担 (送料別)"

        # Extract all high-res images
        images = []
        seen_images = set()

        def add_img(u):
            if not u or not isinstance(u, str):
                return
            clean = u.strip()
            clean = re.sub(r'^https://auc-pctr\.c\.yimg\.jp/i/', 'https://', clean)
            clean = clean.split('?')[0]
            if clean and clean not in seen_images and ('auc' in clean or 'yimg' in clean) and clean.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                seen_images.add(clean)
                images.append(clean)

        # 1. From JSON-LD
        if json_ld_data and "image" in json_ld_data:
            img_list = json_ld_data["image"]
            if isinstance(img_list, str):
                img_list = [img_list]
            for img in img_list:
                add_img(img)

        # 2. From meta og:image
        og_img = soup.find("meta", property="og:image")
        if og_img and og_img.get("content"):
            add_img(og_img["content"])

        # 3. From all <img> tags in page (including lazy-loaded and carousel data attributes)
        for img_tag in soup.find_all("img"):
            for attr in ["src", "data-src", "data-original", "data-lazy", "srcset"]:
                val = img_tag.get(attr)
                if val:
                    if " " in val:
                        for part in val.split(","):
                            add_img(part.strip().split(" ")[0])
                    else:
                        add_img(val)

        # 4. Fallback regex across entire HTML for auction image URLs
        all_auc_imgs = re.findall(r'https://[^\s"\'<>]*(?:auctions\.c\.yimg\.jp|auc-pctr)[^\s"\'<>]+\.(?:jpg|jpeg|png)', html)
        for img_url in all_auc_imgs:
            add_img(img_url)

        # Extract Seller info
        seller_id = ""
        seller_rating = ""
        seller_match = re.search(r'出品者\s*[:：]?\s*([a-zA-Z0-9_\-]+)', html)
        if seller_match:
            seller_id = seller_match.group(1)
        rating_match = re.search(r'([0-9]{1,3}\.[0-9]+%)\s*(?:良い評価)?', html)
        if rating_match:
            seller_rating = rating_match.group(1)

        # Extract bids count
        bids = 0
        if item_detail and item_detail.get("bids") is not None:
            try:
                bids = int(item_detail.get("bids"))
            except Exception:
                bids = 0
        else:
            bid_match = re.search(r'入札\s*[:：]?\s*([0-9]+)\s*件', html)
            if bid_match:
                try:
                    bids = int(bid_match.group(1))
                except Exception:
                    bids = 0

        # Extract remaining time & end time
        left_sec = None
        if item_detail and item_detail.get("leftTime") is not None:
            try:
                left_sec = float(item_detail.get("leftTime"))
            except Exception:
                left_sec = None

        remaining_time = format_remaining_time(left_sec)
        end_time = item_detail.get("formattedEndTime") or item_detail.get("endTime") or ""
        is_ending_soon = bool(left_sec is not None and 0 < left_sec < 7200)
        is_fixed_price = bool(buy_it_now_price > 0 and (buy_price == 0 or buy_price == buy_it_now_price))

        return {
            "success": True,
            "auction_id": auc_id,
            "url": target_url,
            "title": title,
            "buy_price": buy_price,
            "buy_it_now_price": buy_it_now_price,
            "description": description,
            "condition": condition,
            "shipping_buyer_pays": shipping_buyer_pays,
            "shipping_text": shipping_text,
            "estimated_inbound_shipping": estimated_inbound_shipping,
            "shipping_method_name": shipping_method_name,
            "total_procurement": buy_price + estimated_inbound_shipping,
            "is_free_shipping": not shipping_buyer_pays,
            "images": images,
            "seller_id": seller_id,
            "seller_rating": seller_rating,
            "bids": bids,
            "remaining_time": remaining_time,
            "left_seconds": round(left_sec) if left_sec is not None else None,
            "is_ending_soon": is_ending_soon,
            "is_fixed_price": is_fixed_price,
            "end_time": end_time
        }

    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Network communication error: {str(e)}",
            "auction_id": auc_id,
            "url": target_url
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to parse auction details: {str(e)}",
            "auction_id": auc_id,
            "url": target_url
        }

def format_remaining_time(seconds: Optional[float]) -> str:
    """Formats leftTime in seconds into human-friendly string (e.g. 2h 45m left)."""
    if seconds is None:
        return ""
    try:
        sec = int(float(seconds))
        if sec <= 0:
            return "Ended"
        days = sec // 86400
        hours = (sec % 86400) // 3600
        minutes = (sec % 3600) // 60
        if days > 0:
            return f"{days}d {hours}h left"
        elif hours > 0:
            return f"{hours}h {minutes}m left"
        else:
            return f"{minutes}m left"
    except Exception:
        return ""

def search_yahoo_auctions(query: str, limit: int = 12, sort: str = "default") -> List[Dict[str, Any]]:
    """
    Searches Yahoo Auctions for any user keyword and returns a list of matching items
    with title, price, photos, remaining time, bids count, and live estimated profit for flea market resale.
    """
    query = query.strip()
    if not query:
        return []

    import urllib.parse
    encoded = urllib.parse.quote(query)
    sort_param = ""
    if sort == "end":
        sort_param = "&s1=end&o1=a"  # Ending soonest (残り時間の短い順)
    elif sort == "bids":
        sort_param = "&s1=bids&o1=d"  # Most bids (入札の多い順)
    elif sort == "fixed":
        sort_param = "&is_fixed=1"    # Buy It Now only (定額のみ)
    elif sort == "price_asc":
        sort_param = "&s1=cbids&o1=a" # Lowest price

    url = f"https://auctions.yahoo.co.jp/search/search?p={encoded}{sort_param}"
    headers = {
        "User-Agent": USER_AGENTS[0],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8"
    }

    try:
        r = requests.get(url, headers=headers, timeout=10)
        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.DOTALL)
        if not match:
            return []

        data = json.loads(match.group(1))
        items_raw = data.get("props", {}).get("pageProps", {}).get("initialState", {}).get("search", {}).get("items", {}).get("listing", {}).get("items", [])

        results = []
        for it in items_raw[:limit]:
            auc_id = it.get("auctionId")
            if not auc_id:
                continue

            price = int(it.get("price") or it.get("buyNowPrice") or 0)
            img = it.get("imageUrl") or ""
            clean_img = re.sub(r'^https://auc-pctr\.c\.yimg\.jp/i/', 'https://', img).split('?')[0]

            left_sec = it.get("leftTime")
            try:
                left_sec = float(left_sec) if left_sec is not None else None
            except Exception:
                left_sec = None

            rem_time_str = format_remaining_time(left_sec)
            bids_count = int(it.get("bidCount") or 0)
            is_fixed = bool(it.get("isFixedPrice"))
            is_ending_soon = bool(left_sec is not None and 0 < left_sec < 7200)

            # Inbound shipping extraction (Accurately detect Yahoo Auction shipping traps!)
            is_free_shipping = bool(it.get("isFreeShipping"))
            shipping_fee = 0
            if not is_free_shipping:
                if it.get("currentPriceShippingFee") is not None:
                    try:
                        shipping_fee = int(it.get("currentPriceShippingFee") or 0)
                    except Exception:
                        shipping_fee = 0
                elif it.get("buyNowPriceShippingFee") is not None:
                    try:
                        shipping_fee = int(it.get("buyNowPriceShippingFee") or 0)
                    except Exception:
                        shipping_fee = 0
                elif it.get("shippingFee") is not None:
                    try:
                        shipping_fee = int(it.get("shippingFee") or 0)
                    except Exception:
                        shipping_fee = 0

            total_procurement = price + shipping_fee

            # Projected selling price (Hardware spec-aware estimation based on total buy cost)
            try:
                from backend.market_radar import estimate_real_flea_price
                market_est = estimate_real_flea_price(it.get("title", ""), total_procurement)
                if market_est.get("is_custom_spec"):
                    target_sell = market_est["sweet_spot"]
                else:
                    target_sell = round((total_procurement + 500) * 1.35)
            except Exception:
                target_sell = round((total_procurement + 500) * 1.35)

            if target_sell < 1000 and total_procurement > 0:
                target_sell = total_procurement + 500
            fee = round(target_sell * 0.05)
            t_low = (it.get("title", "") or "").lower()
            ship = 750 if any(k in t_low for k in ['laptop', 'ノートpc', 'ノートパソコン', 'パソコン', 'pc', '15.6', '13.3', '14.0']) else 210
            net_profit = target_sell - total_procurement - fee - ship

            results.append({
                "auction_id": auc_id,
                "title": it.get("title", ""),
                "buy_price": price,
                "shipping_fee": shipping_fee,
                "total_procurement": total_procurement,
                "buy_now_price": int(it.get("buyNowPrice") or 0),
                "image": clean_img,
                "is_free_shipping": is_free_shipping,
                "url": f"https://page.auctions.yahoo.co.jp/jp/auction/{auc_id}",
                "target_sell_price": target_sell,
                "estimated_profit": net_profit,
                "bids": bids_count,
                "remaining_time": rem_time_str,
                "left_seconds": round(left_sec) if left_sec is not None else None,
                "is_ending_soon": is_ending_soon,
                "is_fixed_price": is_fixed,
                "end_time": it.get("endTime") or ""
            })

        return results
    except Exception as e:
        print(f"Search error: {e}")
        return []

def fetch_paypay_live_sold(query_or_title: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Directly scrapes actual completed (SOLD) ads from Yahoo! Flea Market (PayPay Flea Market).
    Returns real sold prices, exact listing titles, photos, and direct item links.
    """
    if not query_or_title:
        return []

    # Clean auction noise while preserving the full exact title & model numbers (never truncate!)
    clean = re.sub(r'【[^】]*】|『[^』]*』|「[^」]*」|\[[^\]]*\]|[☆★◆◇■□▲△▼▽◎○※・！!？?♪～~_、,]', ' ', query_or_title)
    clean = re.sub(r'[0-9]+円開始|[0-9]+円スタート|[0-9]+円〜?', ' ', clean)
    clean = re.sub(r'(極美品|超美品|美品|新品|未使用品|未使用|ジャンク品|ジャンク|完品|動作品|動作確認済|送料無料|即決|正規品|未開封|仕様不明|欠品|おまけ|格安|激安|1円)', ' ', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    clean_q = clean if clean else query_or_title.strip()
    
    clean_q_for_url = clean_q.replace('&', ' ').replace('/', ' ')
    clean_q_for_url = re.sub(r'\s+', ' ', clean_q_for_url).strip()
    
    import urllib.parse
    encoded = urllib.parse.quote(clean_q_for_url)
    url = f"https://paypayfleamarket.yahoo.co.jp/search/{encoded}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8"
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=8)
        if resp.status_code != 200:
            return []
        
        m = re.search(r'<script id=[\x22\x27]__NEXT_DATA__[\x22\x27][^>]*>(.*?)</script>', resp.text)
        if not m:
            return []
            
        data = json.loads(m.group(1))
        items = data.get('props', {}).get('initialState', {}).get('searchState', {}).get('search', {}).get('result', {}).get('items', [])
        sold = [it for it in items if it.get('itemStatus') == 'SOLD']
        
        results = []
        is_laptop = any(k in clean_q.lower() for k in ['hp', 'dell', 'thinkpad', 'probook', 'vostro', 'laptop', 'ノート', 'dynabook', 'cf-'])
        shipping_fee = 750 if is_laptop else 210
        
        for it in sold[:limit]:
            iid = it.get('id', '')
            price = int(it.get('price', 0))
            title = it.get('title', '')
            thumb = it.get('thumbnailUrl') or (it.get('images', [{}])[0].get('url') if it.get('images') else '')
            fee = round(price * 0.05)
            net_proceeds = price - fee - shipping_fee
            
            results.append({
                "id": iid,
                "title": title,
                "price": price,
                "price_formatted": f"¥{price:,}",
                "thumbnail": thumb,
                "url": f"https://paypayfleamarket.yahoo.co.jp/item/{iid}",
                "is_free_shipping": True,
                "shipping_label": "送料無料 (Free Shipping)",
                "shipping_cost": shipping_fee,
                "platform_fee": fee,
                "net_proceeds": net_proceeds,
                "sold_badge": "SOLD"
            })
            
        return results
    except Exception as e:
        print(f"Error fetching live flea sold items: {e}")
        return []


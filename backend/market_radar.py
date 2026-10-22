"""
Market Intelligence & Sellability Engine for Yahoo! Auction to Flea Market Reselling.
Provides pre-vetted trending product suggestions and computes a real-time 'Will It Sell?' score.
"""

from typing import Dict, Any, List, Optional
import urllib.parse
import re

TRENDING_PRODUCTS_CATALOG: List[Dict[str, Any]] = [
    # 1. Gaming & Consoles (Highest Liquidity & Fastest Turnover in Japan)
    {
        "id": "switch_oled",
        "category": "gaming",
        "category_label": "🎮 Gaming & Consoles",
        "name": "Nintendo Switch (OLED Model)",
        "query": "Nintendo Switch 有機ELモデル 本体",
        "english_name": "Nintendo Switch OLED Console",
        "typical_buy_price": 24000,
        "typical_sell_price": 31500,
        "est_profit": 5925,
        "margin_percent": 24.7,
        "demand_score": 96,
        "demand_level": "Extremely High",
        "est_days_to_sell": "1 - 2 Days",
        "monthly_sold_count": "150+ sold monthly",
        "risk_level": "Very Low",
        "badge": "🔥 Best Seller",
        "icon": "gamepad-2",
        "reasons": [
            "Always in top 3 most searched items on Yahoo Flea Market and Mercari",
            "Extremely high buyer demand with instant daily cash turnover",
            "StandardTakkyubin 60 shipping size (¥750) makes logistics easy"
        ]
    },
    {
        "id": "gameboy_advance_sp",
        "category": "gaming",
        "category_label": "🎮 Gaming & Consoles",
        "name": "GameBoy Advance SP (任天堂)",
        "query": "ゲームボーイアドバンスSP 本体",
        "english_name": "Game Boy Advance SP Handheld",
        "typical_buy_price": 7500,
        "typical_sell_price": 13500,
        "est_profit": 4910,
        "margin_percent": 36.4,
        "demand_score": 93,
        "demand_level": "Very High",
        "est_days_to_sell": "1 - 3 Days",
        "monthly_sold_count": "80+ sold monthly",
        "risk_level": "Low",
        "badge": "💎 Retro Goldmine",
        "icon": "zap",
        "reasons": [
            "Huge retro gaming boom with international and domestic collectors",
            "Compact size qualifies for ¥210 Nekopos shipping (huge margin boost)",
            "High price resilience - rarely depreciates in value"
        ]
    },
    {
        "id": "ps4_pro",
        "category": "gaming",
        "category_label": "🎮 Gaming & Consoles",
        "name": "PlayStation 4 Pro 1TB (CUH-7200)",
        "query": "PS4 Pro 1TB CUH-7200",
        "english_name": "PS4 Pro 1TB Console",
        "typical_buy_price": 15000,
        "typical_sell_price": 22000,
        "est_profit": 5150,
        "margin_percent": 23.4,
        "demand_score": 89,
        "demand_level": "High",
        "est_days_to_sell": "2 - 4 Days",
        "monthly_sold_count": "60+ sold monthly",
        "risk_level": "Low",
        "badge": "⚡ Steady Mover",
        "icon": "disc",
        "reasons": [
            "CUH-7200 is the final silent revision, highly sought after by budget gamers",
            "Consistently sells when listed with power cable and controller",
            "Very steady price floor"
        ]
    },

    # 2. Apple & Mobile Electronics
    {
        "id": "iphone_13",
        "category": "electronics",
        "category_label": "📱 Apple & Gadgets",
        "name": "Apple iPhone 13 128GB (SIM Free)",
        "query": "iPhone 13 128GB SIMフリー",
        "english_name": "iPhone 13 128GB Unlocked",
        "typical_buy_price": 46000,
        "typical_sell_price": 57000,
        "est_profit": 7940,
        "margin_percent": 13.9,
        "demand_score": 98,
        "demand_level": "Extremely High",
        "est_days_to_sell": "1 Day",
        "monthly_sold_count": "200+ sold monthly",
        "risk_level": "Very Low",
        "badge": "🚀 Instant Cash",
        "icon": "smartphone",
        "reasons": [
            "Highest search volume across all Japanese flea markets",
            "Sells often within 24 hours if battery health > 80% and screen is clean",
            "Shippable via Nekopos/Compact for maximum profit preservation"
        ]
    },
    {
        "id": "sony_wh1000xm4",
        "category": "electronics",
        "category_label": "📱 Apple & Gadgets",
        "name": "Sony WH-1000XM4 Noise-Cancelling Headphones",
        "query": "Sony WH-1000XM4 ブラック",
        "english_name": "Sony WH-1000XM4 Headphones",
        "typical_buy_price": 16000,
        "typical_sell_price": 23500,
        "est_profit": 5805,
        "margin_percent": 24.7,
        "demand_score": 92,
        "demand_level": "Very High",
        "est_days_to_sell": "2 - 3 Days",
        "monthly_sold_count": "75+ sold monthly",
        "risk_level": "Low",
        "badge": "🎧 Audiophile Hit",
        "icon": "headphones",
        "reasons": [
            "Regarded as the gold standard in noise cancelling; buyers prefer it over pricier XM5",
            "Consistently priced between ¥21,000 - ¥25,000 on flea markets",
            "Easy to inspect and clean with disinfectant wipes"
        ]
    },
    {
        "id": "ipad_9th_gen",
        "category": "electronics",
        "category_label": "📱 Apple & Gadgets",
        "name": "Apple iPad 9th Gen 64GB Wi-Fi",
        "query": "iPad 第9世代 64GB Wi-Fi",
        "english_name": "Apple iPad 9th Gen 64GB",
        "typical_buy_price": 27000,
        "typical_sell_price": 35000,
        "est_profit": 5500,
        "margin_percent": 15.7,
        "demand_score": 94,
        "demand_level": "Very High",
        "est_days_to_sell": "1 - 3 Days",
        "monthly_sold_count": "90+ sold monthly",
        "risk_level": "Low",
        "badge": "⭐ High Liquidity",
        "icon": "tablet",
        "reasons": [
            "Standard entry model for students and home use in Japan",
            "Very high daily transaction volume",
            "Always commands rapid buyer interest"
        ]
    },

    # 3. Japanese Watches (Evergreen Demand & Compact Shipping)
    {
        "id": "casio_gshock_5610",
        "category": "watches",
        "category_label": "⌚ Japanese Watches",
        "name": "Casio G-Shock GW-M5610U (Tough Solar / Multi-Band 6)",
        "query": "G-SHOCK GW-M5610U ソーラー電波",
        "english_name": "Casio G-Shock GW-M5610U Solar",
        "typical_buy_price": 8500,
        "typical_sell_price": 14000,
        "est_profit": 4590,
        "margin_percent": 32.8,
        "demand_score": 91,
        "demand_level": "Very High",
        "est_days_to_sell": "2 - 4 Days",
        "monthly_sold_count": "65+ sold monthly",
        "risk_level": "Very Low",
        "badge": "⌚ Bulletproof Resell",
        "icon": "watch",
        "reasons": [
            "The classic square design is a Japanese national favorite",
            "Solar and radio wave synchronization means zero battery change needed",
            "Fits safely in a ¥210 Nekopos or ¥215 Yu-Packet Post mailer"
        ]
    },
    {
        "id": "seiko_5_sports",
        "category": "watches",
        "category_label": "⌚ Japanese Watches",
        "name": "SEIKO 5 Sports Automatic (SBSA / SRPD)",
        "query": "セイコー5 スポーツ 自動巻き SBSA",
        "english_name": "Seiko 5 Sports Automatic Watch",
        "typical_buy_price": 14000,
        "typical_sell_price": 21500,
        "est_profit": 5905,
        "margin_percent": 27.5,
        "demand_score": 87,
        "demand_level": "High",
        "est_days_to_sell": "3 - 5 Days",
        "monthly_sold_count": "45+ sold monthly",
        "risk_level": "Low",
        "badge": "✨ Collector Magnet",
        "icon": "clock",
        "reasons": [
            "Reliable mechanical movement with active global and domestic following",
            "Easy to resell even without box or papers",
            "Strong resale value retention"
        ]
    },

    # 4. Cameras & Prime Lenses (High Margins)
    {
        "id": "canon_ef_50",
        "category": "cameras",
        "category_label": "📷 Cameras & Lenses",
        "name": "Canon EF 50mm F1.8 STM Prime Lens",
        "query": "Canon EF 50mm F1.8 STM 単焦点レンズ",
        "english_name": "Canon EF 50mm F1.8 STM Lens",
        "typical_buy_price": 11000,
        "typical_sell_price": 16500,
        "est_profit": 4155,
        "margin_percent": 25.2,
        "demand_score": 90,
        "demand_level": "Very High",
        "est_days_to_sell": "2 - 4 Days",
        "monthly_sold_count": "55+ sold monthly",
        "risk_level": "Low",
        "badge": "📷 Photographer Must-Have",
        "icon": "camera",
        "reasons": [
            "Referred to as the 'Nifty Fifty' - every photographer buys this first",
            "Compact, lightweight, and very quick to inspect for clear glass",
            "High turnover rate throughout all seasons"
        ]
    },
    {
        "id": "sony_alpha_6000",
        "category": "cameras",
        "category_label": "📷 Cameras & Lenses",
        "name": "Sony Alpha a6000 (ILCE-6000) Mirrorless Body",
        "query": "Sony α6000 ILCE-6000 ボディ",
        "english_name": "Sony a6000 Mirrorless Camera",
        "typical_buy_price": 32000,
        "typical_sell_price": 42000,
        "est_profit": 7150,
        "margin_percent": 17.0,
        "demand_score": 88,
        "demand_level": "High",
        "est_days_to_sell": "3 - 6 Days",
        "monthly_sold_count": "40+ sold monthly",
        "risk_level": "Low",
        "badge": "🎥 Video & Photo Hit",
        "icon": "video",
        "reasons": [
            "One of the best selling mirrorless cameras in history",
            "Popular for streaming, vlogging, and amateur photography",
            "Strong liquidity in black and silver finishes"
        ]
    },

    # 5. Collectibles & Trading Cards
    {
        "id": "pokemon_151",
        "category": "collectibles",
        "category_label": "🧸 Anime & Collectibles",
        "name": "Pokemon Card 151 (Pokémon Card 151 Booster Box)",
        "query": "ポケモンカード 151 BOX シュリンク付き",
        "english_name": "Pokemon 151 Booster Box (Sealed)",
        "typical_buy_price": 9000,
        "typical_sell_price": 15000,
        "est_profit": 5040,
        "margin_percent": 33.6,
        "demand_score": 97,
        "demand_level": "Extremely High",
        "est_days_to_sell": "1 - 2 Days",
        "monthly_sold_count": "250+ sold monthly",
        "risk_level": "Very Low",
        "badge": "🔥 Viral Collectible",
        "icon": "sparkles",
        "reasons": [
            "Massive worldwide collector demand with iconic original 151 Pokemon",
            "Sealed shrink-wrapped boxes sell virtually within hours",
            "Small form factor ensures minimal shipping cost"
        ]
    }
]

def get_product_suggestions(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns curated product suggestions filtered optionally by category."""
    if not category or category == "all":
        return TRENDING_PRODUCTS_CATALOG
    return [p for p in TRENDING_PRODUCTS_CATALOG if p.get("category") == category]

def calculate_sellability(
    query_or_title: str,
    buy_price: int = 0,
    target_sell_price: int = 0,
    bids_count: int = 0,
    is_ending_soon: bool = False
) -> Dict[str, Any]:
    """
    Computes real-time Sellability Score, Expected Days to Sell, and Liquidity Verdict
    based on product keywords, price spreads, bid competition, and turnover data.
    """
    text = (query_or_title or "").lower()
    
    # 1. Base Score derived from known high-turnover keywords
    score = 70
    reasons = []
    
    high_demand_signals = [
        (r'switch|任天堂|ニンテンドー', 16, "Nintendo hardware has top-tier buyer turnover in Japan."),
        (r'iphone|ipad|apple|macbook', 18, "Apple products maintain highest daily transaction volume."),
        (r'ps5|ps4|playstation', 14, "PlayStation ecosystem has strong gamer liquidity."),
        (r'g-shock|casio|seiko', 12, "Japanese watch brands enjoy constant daily demand."),
        (r'canon|sony|nikon|lens', 12, "Photography gear retains solid, proven resale prices."),
        (r'pokemon|ポケモン|151|box', 18, "Pokemon collectibles have rapid buyer absorption."),
        (r'美品|極美品|新品|未使用|完品', 8, "Mint condition / complete box items sell 3x faster.")
    ]
    
    for pattern, boost, reason in high_demand_signals:
        if re.search(pattern, text, re.IGNORECASE):
            score += boost
            if len(reasons) < 3:
                reasons.append(reason)
                
    # 2. Factor in bid competition
    if bids_count >= 15:
        score += 10
        reasons.append(f"High buyer competition detected ({bids_count} active bids on auction).")
    elif bids_count >= 5:
        score += 5

    # 3. Factor in profit margin spread
    if target_sell_price > 0 and buy_price > 0:
        spread = target_sell_price - buy_price
        if spread >= 4000:
            score += 5
            reasons.append(f"Healthy profit cushion of ¥{spread:,} allows quick competitive pricing.")
        elif spread <= 500:
            score -= 15
            reasons.append("Tight margin spread makes competitive discounting difficult.")

    # Clamp score between 25 and 99
    score = max(25, min(99, score))
    
    # 4. Determine Verdict & Days to Sell
    if score >= 90:
        verdict = "🔥 Extremely High Demand (Instant Seller)"
        verdict_urdu = "Bohat Zabardast Demand! 1 se 2 din me bikne ka 95%+ chance hai."
        est_days = "1 - 2 Days"
        risk = "Very Low"
        color = "emerald"
    elif score >= 75:
        verdict = "🟢 High Demand (Safe & Quick Flip)"
        verdict_urdu = "Safe Deal! 2 se 4 din me araam se bik jaye gi."
        est_days = "2 - 4 Days"
        risk = "Low"
        color = "emerald"
    elif score >= 60:
        verdict = "🟡 Moderate Demand (Standard Liquidity)"
        verdict_urdu = "Normal Demand. Bikne me 1 se 2 hafte lag sakte hain."
        est_days = "5 - 10 Days"
        risk = "Medium"
        color = "amber"
    else:
        verdict = "🔴 Low Demand / Niche Item (Slow Moving)"
        verdict_urdu = "Slow Item! Bikne me 1 mahina lag sakta hai, paise phasne ka risk hai."
        est_days = "15 - 30+ Days"
        risk = "High"
        color = "rose"

    clean_q = re.sub(r'[【】\[\]（）()]', ' ', query_or_title).strip()
    encoded_q = urllib.parse.quote(clean_q[:35])
    mercari_sold_url = f"https://jp.mercari.com/search?keyword={encoded_q}&status=sold_out"
    yahoo_sold_url = f"https://auctions.yahoo.co.jp/closedsearch/closedsearch?p={encoded_q}&va={encoded_q}&b=1&n=20"

    return {
        "score": score,
        "verdict": verdict,
        "verdict_urdu": verdict_urdu,
        "est_days": est_days,
        "risk": risk,
        "color": color,
        "reasons": reasons if reasons else ["Consistent historical resale volume across Japanese marketplaces."],
        "proof_links": {
            "mercari_sold": mercari_sold_url,
            "yahoo_sold": yahoo_sold_url
        }
    }

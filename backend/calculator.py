import math
from typing import Dict, Any, Optional

SHIPPING_METHODS = [
    {
        "id": "nekopos",
        "name": "Nekopos (Yamato) - A4, up to 3cm / 1kg",
        "cost": 210,
        "max_size": "A4 / 3cm thick / up to 1kg",
        "desc": "Small electronics, accessories, games, books, trading cards"
    },
    {
        "id": "yu_packet_post",
        "name": "Yu-Packet Post - Standard Postbox Slot",
        "cost": 215,
        "max_size": "Postbox slot (~3.5-4cm) / up to 2kg",
        "desc": "Thick clothing, manga sets, books, boxed small accessories"
    },
    {
        "id": "takkyubin_compact",
        "name": "Takkyubin Compact (Dedicated Box Included)",
        "cost": 520,  # 450 shipping + 70 box
        "max_size": "Dedicated Box (25x20x5cm) / up to 2kg",
        "desc": "Small electronics, watches, wallets, perfumes, games"
    },
    {
        "id": "takkyubin_60",
        "name": "Takkyubin 60 Size - Up to 60cm total",
        "cost": 750,
        "max_size": "Total 3 sides 60cm / up to 2kg",
        "desc": "Shoes, folded jackets, camera bodies, figures, bags"
    },
    {
        "id": "takkyubin_80",
        "name": "Takkyubin 80 Size - Up to 80cm total",
        "cost": 850,
        "max_size": "Total 3 sides 80cm / up to 5kg",
        "desc": "Sneaker boxes, mid-size electronics, winter coats, helmets"
    },
    {
        "id": "takkyubin_100",
        "name": "Takkyubin 100 Size - Up to 100cm total",
        "cost": 1050,
        "max_size": "Total 3 sides 100cm / up to 10kg",
        "desc": "Gaming consoles (PS5/Switch boxed), monitors, audio bundles"
    },
    {
        "id": "custom",
        "name": "Custom Shipping (Manual Input)",
        "cost": 0,
        "max_size": "Custom",
        "desc": "LetterPack, oversized parcels, courier services"
    }
]

PLATFORM_FEES = {
    "yahoo_flea": {
        "name": "Yahoo! Flea Market (5% Fee)",
        "rate": 0.05,
        "desc": "Platform fee 5% (lowest marketplace fee in Japan)"
    },
    "mercari": {
        "name": "Mercari Japan (10% Fee)",
        "rate": 0.10,
        "desc": "Platform fee 10% (largest buyer traffic in Japan)"
    },
    "rakuma": {
        "name": "Rakuten Rakuma (6.6% Fee)",
        "rate": 0.066,
        "desc": "Platform fee 6.6%"
    }
}

def calculate_profit(
    buy_price: int,
    inbound_shipping: int = 0,
    sell_price: int = 0,
    shipping_out: int = 210,
    packaging_cost: int = 0,
    platform: str = "yahoo_flea",
    custom_fee_rate: Optional[float] = None
) -> Dict[str, Any]:
    """
    Calculate full breakdown of costs, fees, net profit and margin.
    """
    buy_price = max(0, int(buy_price or 0))
    inbound_shipping = max(0, int(inbound_shipping or 0))
    sell_price = max(0, int(sell_price or 0))
    shipping_out = max(0, int(shipping_out or 0))
    packaging_cost = max(0, int(packaging_cost or 0))

    fee_info = PLATFORM_FEES.get(platform, PLATFORM_FEES["yahoo_flea"])
    fee_rate = custom_fee_rate if custom_fee_rate is not None else fee_info["rate"]

    # Calculate platform commission fee (always rounded down or standard in Japan)
    platform_fee = math.floor(sell_price * fee_rate)

    # Cost breakdown
    procurement_cost = buy_price + inbound_shipping  # 仕入れ総額
    operation_cost = shipping_out + packaging_cost   # 発送・資材費
    total_cost = procurement_cost + operation_cost + platform_fee

    # Net profit
    net_profit = sell_price - total_cost

    # Profit margin (%) = Net profit / Sell price
    profit_margin = round((net_profit / sell_price * 100), 1) if sell_price > 0 else 0.0

    # ROI (%) = Net profit / Procurement cost
    roi = round((net_profit / procurement_cost * 100), 1) if procurement_cost > 0 else 0.0

    return {
        "buy_price": buy_price,
        "inbound_shipping": inbound_shipping,
        "procurement_cost": procurement_cost,
        "sell_price": sell_price,
        "platform": platform,
        "platform_name": fee_info["name"],
        "fee_rate": fee_rate,
        "fee_rate_percent": round(fee_rate * 100, 1),
        "platform_fee": platform_fee,
        "shipping_out": shipping_out,
        "packaging_cost": packaging_cost,
        "total_cost": total_cost,
        "net_profit": net_profit,
        "profit_margin": profit_margin,
        "roi": roi,
        "is_profitable": net_profit > 0
    }

def suggest_prices(
    buy_price: int,
    inbound_shipping: int = 0,
    shipping_out: int = 210,
    packaging_cost: int = 0,
    platform: str = "yahoo_flea",
    custom_fee_rate: Optional[float] = None
) -> Dict[str, Any]:
    """
    Suggest selling prices based on break-even and desired profit margins.
    """
    fee_info = PLATFORM_FEES.get(platform, PLATFORM_FEES["yahoo_flea"])
    fee_rate = custom_fee_rate if custom_fee_rate is not None else fee_info["rate"]
    base_cost = buy_price + inbound_shipping + shipping_out + packaging_cost

    # 1. Break-even price (損益分岐点) -> Net Profit = 0
    # sell_price * (1 - fee_rate) = base_cost
    breakeven_price = math.ceil(base_cost / (1 - fee_rate)) if fee_rate < 1 else base_cost

    # 2. Target Yen profits
    target_1000 = math.ceil((base_cost + 1000) / (1 - fee_rate))
    target_2000 = math.ceil((base_cost + 2000) / (1 - fee_rate))
    target_3000 = math.ceil((base_cost + 3000) / (1 - fee_rate))
    target_5000 = math.ceil((base_cost + 5000) / (1 - fee_rate))

    # 3. Target margin rates (15%, 25%, 35%)
    def price_for_margin(margin_rate: float):
        denom = 1 - fee_rate - margin_rate
        if denom <= 0:
            return 0
        return math.ceil(base_cost / denom)

    margin_15 = price_for_margin(0.15)
    margin_25 = price_for_margin(0.25)
    margin_35 = price_for_margin(0.35)

    return {
        "breakeven_price": breakeven_price,
        "target_profit_1000": target_1000,
        "target_profit_2000": target_2000,
        "target_profit_3000": target_3000,
        "target_profit_5000": target_5000,
        "margin_15_percent": margin_15,
        "margin_25_percent": margin_25,
        "margin_35_percent": margin_35
    }

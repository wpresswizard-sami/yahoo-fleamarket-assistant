import math
from typing import Dict, Any, Optional

SHIPPING_METHODS = [
    {
        "id": "nekopos",
        "name": "おてがる配送 ネコポス (ヤマト運輸)",
        "cost": 210,
        "max_size": "A4・厚さ3cm・重さ1kg以内",
        "desc": "小物、本、薄手の衣類、スマホケース、トレカなど"
    },
    {
        "id": "yu_packet_post",
        "name": "おてがる配送 ゆうパケットポスト",
        "cost": 215,
        "max_size": "専用シール貼付・郵便ポストに入る厚さ (約3.5~4cm)・重さ2kg以内",
        "desc": "衣類、コミックセット、厚みのある小物など"
    },
    {
        "id": "takkyubin_compact",
        "name": "おてがる配送 宅急便コンパクト (箱代込)",
        "cost": 520,  # 450円送料 + 70円専用箱代
        "max_size": "専用BOX (25×20×5cm) / 薄型BOX",
        "desc": "小型家電、財布、化粧品、厚手の服、ゲームソフト複数"
    },
    {
        "id": "takkyubin_60",
        "name": "おてがる配送 宅急便 60サイズ",
        "cost": 750,
        "max_size": "3辺合計60cm・重さ2kg以内",
        "desc": "靴、厚手のアウター、小型フィギュア、バッグなど"
    },
    {
        "id": "takkyubin_80",
        "name": "おてがる配送 宅急便 80サイズ",
        "cost": 850,
        "max_size": "3辺合計80cm・重さ5kg以内",
        "desc": "スニーカー箱、中型家電、ヘルメット、コートなど"
    },
    {
        "id": "takkyubin_100",
        "name": "おてがる配送 宅急便 100サイズ",
        "cost": 1050,
        "max_size": "3辺合計100cm・重さ10kg以内",
        "desc": "ゲーム機本体セット、中型モニター、アパレルまとめ売りなど"
    },
    {
        "id": "custom",
        "name": "カスタム送料 (手動入力)",
        "cost": 0,
        "max_size": "自由設定",
        "desc": "定形外、レターパック、大型配送など"
    }
]

PLATFORM_FEES = {
    "yahoo_flea": {
        "name": "Yahoo! フリマ (旧PayPayフリマ)",
        "rate": 0.05,
        "desc": "販売手数料 5% (業界最安水準)"
    },
    "mercari": {
        "name": "メルカリ (Mercari)",
        "rate": 0.10,
        "desc": "販売手数料 10%"
    },
    "rakuma": {
        "name": "楽天ラクマ (Rakuma)",
        "rate": 0.066, # 基本約6.6% (利用実績により変動)
        "desc": "販売手数料 6.6% (最大10%)"
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

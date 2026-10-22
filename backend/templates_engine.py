import re
from typing import Dict, Any, List

CLEANUP_PHRASES = [
    r'ノークレーム[・\s]*ノーリターン[・\s]*ノーキャンセル',
    r'ノークレーム[・\s]*ノーリターン',
    r'ノーリターン[・\s]*ノークレーム',
    r'NCNR',
    r'３Nでお願い(?:します|致します)',
    r'3Nでお願い(?:します|致します)',
    r'落札後\s*[0-9０-９]+\s*時間以内(?:にご連絡|に決済)',
    r'評価の悪い方(?:の入札|はお断り|は削除)',
    r'新規IDの(?:入札|方|はお断り)',
    r'入札の取り消しは(?:お受け|対応|できません)',
    r'落札手数料は.*',
    r'かんたん決済の期限内.*',
    r'神経質な方の(?:ご入札|入札)はお控え.*',
]

KEYWORD_PILLS = [
    "【極美品】",
    "【新品未使用】",
    "【送料無料】",
    "【即購入OK】",
    "【24時間以内発送】",
    "【匿名配送】",
    "【限定特価】",
    "【おまけ付】",
    "【動作確認済】",
    "【正規品】"
]

TEMPLATES = {
    "standard_en": {
        "id": "standard_en",
        "name": "Standard Listing (English)",
        "render": lambda title, condition, desc: f"""Thank you for viewing this listing!
Instant purchase is welcome! ✨

[Product Name]
{title}

[Condition]
{condition}
Clean and well maintained, no major scratches or damages.
*Please inspect all attached photos for details.

[Item Details & Description]
{desc}

[Shipping & Handling]
• Secure anonymous tracked shipping
• Carefully wrapped in protective bubble wrap and waterproof packaging
• Dispatched promptly within 24 to 48 hours

[Additional Notes]
• From a smoke-free and pet-free environment.
• Feel free to ask any questions in the comments!
"""
    },
    "electronics_en": {
        "id": "electronics_en",
        "name": "Electronics & Gaming (English)",
        "render": lambda title, condition, desc: f"""Thank you for visiting!
We ensure prompt, secure, and professional transactions.

[Product Name]
{title}

[Item Condition & Testing]
Condition Rank: {condition}
Fully powered on and operation confirmed.
Cleaned and sanitized before packing.

[Included Accessories]
• Everything shown in the photos is included.

[Description]
{desc}

[Packaging & Delivery]
• Precision device securely packed with thick bubble wrap inside a sturdy cardboard box.
• Fast dispatch within 24 hours via tracked delivery.

Instant buy is welcome! Thank you.
"""
    },
    "fashion_en": {
        "id": "fashion_en",
        "name": "Fashion & Apparel (English)",
        "render": lambda title, condition, desc: f"""Thank you for checking out this item!
Followers and instant purchases welcome! ✨

[Brand & Product]
{title}

[Condition]
{condition}
Clean with minimal signs of wear, ready for long-term use.

[Description & Sizing]
{desc}

[Packaging & Shipping]
• Neatly folded and protected in waterproof packaging.
• Shipped within 1 to 2 days with tracking number.

Thank you!
"""
    },
    "hobby_en": {
        "id": "hobby_en",
        "name": "Collectibles & Hobby (English)",
        "render": lambda title, condition, desc: f"""Thank you for viewing!

[Item Name]
{title}

[Condition]
{condition}
Stored carefully in a dark, dust-free collection space.

[Description]
{desc}

[Packaging & Shipping]
• Valuable collectible: securely protected with cardboard reinforcements and thick bubble wrap against bends and moisture.
• Fast, tracked shipping.

Available for immediate purchase, first come first served!
"""
    },
    "standard": {
        "id": "standard",
        "name": "Standard Flea Market (Japanese)",
        "render": lambda title, condition, desc: f"""ご覧いただきありがとうございます！
即購入大歓迎・無言購入もOKです✨

【商品名】
{title}

【商品の状態】
{condition}
目立つ傷や汚れはなく、まだまだ気持ちよくお使いいただけます。
※詳細は掲載写真をご確認ください。

【詳細・説明】
{desc}

【発送について】
・安心安全の『匿名配送（おてがる配送）』
・プチプチ等の緩衝材で丁寧に防水梱包いたします
・ご購入から24時間〜48時間以内に迅速に発送いたします

【その他】
・タバコは吸っておらず、ペットも飼っておりません。
・ご不明点はお気軽にコメントください！
"""
    },
    "electronics": {
        "id": "electronics",
        "name": "Electronics & Gaming (Japanese)",
        "render": lambda title, condition, desc: f"""ご覧いただきありがとうございます！
迅速・丁寧なお取引を心掛けております。

【商品名】
{title}

【商品状態・動作状況】
状態ランク: {condition}
通電および動作確認済みです。
クリーニングおよびアルコール除菌シートで清掃済みです。

【付属品】
・掲載写真に写っているものが全てとなります。

【商品説明】
{desc}

【梱包・発送】
・精密機械のため、プチプチ緩衝材を厳重に巻き、ダンボールにて丁寧に梱包します。
・安心の『匿名配送』にて24時間以内のスピード発送を心掛けています。

即購入OKです！よろしくお願いいたします。
"""
    },
    "fashion": {
        "id": "fashion",
        "name": "Fashion & Apparel (Japanese)",
        "render": lambda title, condition, desc: f"""ご覧いただきありがとうございます！
フォロワー様・即購入大歓迎です✨

【ブランド・商品名】
{title}

【状態】
{condition}
目立ったほつれや汚れ、使用感も少なく、まだまだ長くご愛用いただけます。

【サイズ・実寸（平置き）】
※詳細は写真またはご質問にてご確認ください。

【商品説明】
{desc}

【発送・梱包】
・丁寧に畳み、水濡れ防止のOPP袋・宅配袋にて梱包いたします。
・おてがる配送（匿名配送）にて、入金確認後1〜2日以内に発送いたします。

よろしくお願いいたします！
"""
    },
    "hobby": {
        "id": "hobby",
        "name": "Hobby & Figures (Japanese)",
        "render": lambda title, condition, desc: f"""ご覧いただきありがとうございます！

【商品名】
{title}

【状態】
{condition}
コレクション整理のため出品いたします。
暗所にて大切に保管しておりました。

【商品説明】
{desc}

【梱包・発送について】
・大切なコレクションですので、折れ・水濡れ対策・プチプチ等で厳重に梱包いたします。
・安心の匿名配送にて発送いたします。

即購入OK、早い者勝ちでどうぞ！
"""
    }
}

def clean_yahoo_description(raw_desc: str) -> str:
    """Cleans auction-specific harsh rules and formatting from description."""
    if not raw_desc:
        return ""
    
    # Replace html breaks and entities
    text = re.sub(r'<br\s*/?>', '\n', raw_desc, flags=re.IGNORECASE)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'<[^>]+>', '', text)

    lines = []
    for line in text.split('\n'):
        line_clean = line.strip()
        if not line_clean:
            continue
        # Check against blacklist phrases
        skip = False
        for pattern in CLEANUP_PHRASES:
            if re.search(pattern, line_clean, flags=re.IGNORECASE):
                skip = True
                break
        if not skip:
            lines.append(line_clean)
    
    # Limit repeating newlines
    cleaned = "\n".join(lines)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()

def generate_flea_description(
    template_id: str,
    title: str,
    condition: str,
    description: str
) -> str:
    """Generates a polite, ready-to-paste Japanese flea market description."""
    cleaned_desc = clean_yahoo_description(description)
    tpl = TEMPLATES.get(template_id, TEMPLATES["standard"])
    return tpl["render"](title, condition, cleaned_desc).strip()

def get_template_list() -> List[Dict[str, str]]:
    """Returns available templates."""
    return [{"id": k, "name": v["name"]} for k, v in TEMPLATES.items()]

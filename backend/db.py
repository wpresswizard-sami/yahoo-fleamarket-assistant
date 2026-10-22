import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "inventory.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            auction_id TEXT,
            source_url TEXT,
            title TEXT,
            images_json TEXT,
            buy_price INTEGER DEFAULT 0,
            inbound_shipping INTEGER DEFAULT 0,
            sell_price INTEGER DEFAULT 0,
            shipping_out INTEGER DEFAULT 210,
            packaging_cost INTEGER DEFAULT 0,
            platform TEXT DEFAULT 'yahoo_flea',
            fee_rate REAL DEFAULT 0.05,
            platform_fee INTEGER DEFAULT 0,
            net_profit INTEGER DEFAULT 0,
            profit_margin REAL DEFAULT 0.0,
            condition TEXT DEFAULT '',
            description TEXT DEFAULT '',
            status TEXT DEFAULT 'watching',
            notes TEXT DEFAULT '',
            created_at TEXT,
            updated_at TEXT,
            sold_at TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT UNIQUE,
            results_count INTEGER DEFAULT 0,
            updated_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def add_item(data: Dict[str, Any]) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    images_json = json.dumps(data.get("images", []), ensure_ascii=False)
    sold_at = now_str if data.get("status") == "sold" else None

    cursor.execute("""
        INSERT INTO items (
            auction_id, source_url, title, images_json, buy_price, inbound_shipping,
            sell_price, shipping_out, packaging_cost, platform, fee_rate,
            platform_fee, net_profit, profit_margin, condition, description,
            status, notes, created_at, updated_at, sold_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("auction_id", ""),
        data.get("source_url", ""),
        data.get("title", ""),
        images_json,
        int(data.get("buy_price", 0)),
        int(data.get("inbound_shipping", 0)),
        int(data.get("sell_price", 0)),
        int(data.get("shipping_out", 210)),
        int(data.get("packaging_cost", 0)),
        data.get("platform", "yahoo_flea"),
        float(data.get("fee_rate", 0.05)),
        int(data.get("platform_fee", 0)),
        int(data.get("net_profit", 0)),
        float(data.get("profit_margin", 0.0)),
        data.get("condition", ""),
        data.get("description", ""),
        data.get("status", "watching"),
        data.get("notes", ""),
        now_str,
        now_str,
        sold_at
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def get_items(status: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM items WHERE 1=1"
    params = []
    
    if status and status != "all":
        query += " AND status = ?"
        params.append(status)
        
    if search:
        query += " AND (title LIKE ? OR notes LIKE ? OR auction_id LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])
        
    query += " ORDER BY id DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["images"] = json.loads(d.get("images_json", "[]"))
        except Exception:
            d["images"] = []
        result.append(d)
        
    conn.close()
    return result

def get_item(item_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    try:
        d["images"] = json.loads(d.get("images_json", "[]"))
    except Exception:
        d["images"] = []
    return d

def update_item(item_id: int, data: Dict[str, Any]) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    existing = get_item(item_id)
    if not existing:
        conn.close()
        return False

    sold_at = existing.get("sold_at")
    new_status = data.get("status", existing.get("status"))
    if new_status == "sold" and not sold_at:
        sold_at = now_str
    elif new_status != "sold":
        sold_at = None

    images_json = existing.get("images_json")
    if "images" in data:
        images_json = json.dumps(data["images"], ensure_ascii=False)

    cursor.execute("""
        UPDATE items SET
            title = ?,
            buy_price = ?,
            inbound_shipping = ?,
            sell_price = ?,
            shipping_out = ?,
            packaging_cost = ?,
            platform = ?,
            fee_rate = ?,
            platform_fee = ?,
            net_profit = ?,
            profit_margin = ?,
            condition = ?,
            description = ?,
            status = ?,
            notes = ?,
            images_json = ?,
            updated_at = ?,
            sold_at = ?
        WHERE id = ?
    """, (
        data.get("title", existing["title"]),
        int(data.get("buy_price", existing["buy_price"])),
        int(data.get("inbound_shipping", existing["inbound_shipping"])),
        int(data.get("sell_price", existing["sell_price"])),
        int(data.get("shipping_out", existing["shipping_out"])),
        int(data.get("packaging_cost", existing["packaging_cost"])),
        data.get("platform", existing["platform"]),
        float(data.get("fee_rate", existing["fee_rate"])),
        int(data.get("platform_fee", existing["platform_fee"])),
        int(data.get("net_profit", existing["net_profit"])),
        float(data.get("profit_margin", existing["profit_margin"])),
        data.get("condition", existing["condition"]),
        data.get("description", existing["description"]),
        new_status,
        data.get("notes", existing["notes"]),
        images_json,
        now_str,
        sold_at,
        item_id
    ))
    conn.commit()
    conn.close()
    return True

def delete_item(item_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def get_stats() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM items")
    total_count = cursor.fetchone()[0]

    cursor.execute("SELECT status, COUNT(*) FROM items GROUP BY status")
    status_counts = {r[0]: r[1] for r in cursor.fetchall()}

    cursor.execute("""
        SELECT 
            COALESCE(SUM(sell_price), 0),
            COALESCE(SUM(net_profit), 0),
            COALESCE(AVG(profit_margin), 0.0)
        FROM items WHERE status = 'sold'
    """)
    sold_row = cursor.fetchone()
    total_revenue = sold_row[0]
    total_profit = sold_row[1]
    avg_margin = round(sold_row[2], 1)

    cursor.execute("SELECT COALESCE(SUM(buy_price + inbound_shipping), 0) FROM items WHERE status IN ('won', 'in_stock', 'listed')")
    inventory_investment = cursor.fetchone()[0]

    conn.close()
    return {
        "total_items": total_count,
        "watching_count": status_counts.get("watching", 0),
        "won_count": status_counts.get("won", 0),
        "in_stock_count": status_counts.get("in_stock", 0),
        "listed_count": status_counts.get("listed", 0),
        "sold_count": status_counts.get("sold", 0),
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "inventory_investment": inventory_investment,
        "avg_margin": avg_margin
    }

def save_search_history(query: str, results_count: int = 0) -> None:
    if not query or not query.strip():
        return
    q = query.strip()
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO search_history (query, results_count, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(query) DO UPDATE SET
            results_count = excluded.results_count,
            updated_at = excluded.updated_at
    """, (q, results_count, now_str))
    conn.commit()
    conn.close()

def get_search_history(limit: int = 15) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT query, results_count, updated_at
        FROM search_history
        ORDER BY updated_at DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    history = [{"query": row["query"], "results_count": row["results_count"], "updated_at": row["updated_at"]} for row in rows]
    conn.close()
    return history

def delete_search_history(query: Optional[str] = None) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    if query:
        cursor.execute("DELETE FROM search_history WHERE query = ?", (query.strip(),))
    else:
        cursor.execute("DELETE FROM search_history")
    conn.commit()
    conn.close()

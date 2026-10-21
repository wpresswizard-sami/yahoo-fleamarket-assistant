# 🛍️ ヤフオク → Yahoo!フリマ 転売アシスタント
### Yahoo! Auctions to Yahoo! Flea Market Reseller Pro

A complete local desktop & web application built for sellers in Japan reselling products from **Yahoo! Auctions (ヤフオク!)** to **Yahoo! Flea Market (Yahoo! フリマ / 旧PayPayフリマ)** and Mercari (メルカリ).

---

## 🚀 How to Run / Chalane Ka Tareeqa

### Option 1: Desktop Shortcut (Sabse Aasan)
Apne Windows **Desktop** par **`Yahoo-FleaMarket-Assistant.bat`** file par double-click karein:
- Server automatically start ho jayega.
- Aapke default browser me `http://localhost:8000` automatically open ho jayega.

### Option 2: Project Folder
1. Is folder me jayein:
   `C:\Users\Sami\.gemini\antigravity\scratch\yahoo-fleamarket-assistant\`
2. **`run.bat`** par double click karein.

---

## ✨ Main Features (Saari Sahuliyat)

### 1. 🔍 1-Click Yahoo Auction Scraper (ヤフオク自動解析)
- Yahoo Auction ka koi bhi link ya Auction ID paste karein (e.g. `c1246060178` ya full URL) aur **「1クリック商品解析」** dabayein.
- Item title, Current/Buy-it-now price (即決価格), item condition, inbound shipping fee, seller rating, aur sab high-resolution photos automatically fetch ho jati hain.

### 2. 🖼️ High-Res Image Gallery & ZIP Downloader (画像一括保存)
- Yahoo auction ki saari photos HD me display hoti hain.
- **「全画像をZIPで一括保存」** button dabate hi saari photos ek ZIP file me download ho jati hain taaki aap Yahoo! Flea Market par direct upload kar sakein.

### 3. ✍️ Flea Market Title & Japanese Template Optimizer (出品文作成)
- **Title Character Counter**: Yahoo! Flea Market aur Mercari ka title limit **40 characters** hota hai. Yeh tool live green/red counter dikhata hai.
- **1-Click Keyword Pills**: `【極美品】`, `【新品未使用】`, `【送料無料】`, `【24時間以内発送】`, `【即購入OK】` par click karte hi title ke shuru me lag jate hain.
- **Pre-made Japanese Templates**:
  - 万能・標準テンプレート (General)
  - 家電・ゲーム・ガジェット専用 (Electronics/Games)
  - ファッション・アパレル専用 (Fashion/Clothes)
  - ホビー・フィギュア・トレカ専用 (Hobby/Collectibles)
- **Automatic Cleaner**: Yahoo auction ka harsh text (jaise `ノークレームノーリターン (3N)`, `落札後24時間以内に決済` wagera) automatically saaf karke customer-friendly polite Japanese me convert karta hai.
- **1-Click Copy**: Title aur Description ek click me clipboard pe copy ho jate hain.

### 4. 🧮 Live Profit & Shipping Calculator (利益計算機)
- **Japan Domestic Shipping Options Built-in**:
  - おてがる配送 ネコポス (¥210)
  - おてがる配送 ゆうパケットポスト (¥215)
  - おてがる配送 宅急便コンパクト (¥520 - 箱代込)
  - 宅急便 60 / 80 / 100 サイズ (¥750 〜 ¥1,050)
- **Platform Fee**:
  - Yahoo! フリマ (5% fee)
  - Mercari (10% fee)
- **Real-time Profit Display**:
  - Net Profit (純利益 ¥)
  - Profit Margin (利益率 %)
  - ROI (%)
- **One-Click Suggested Prices (価格提案)**:
  - 損益分岐点 (Breakeven - No profit/loss)
  - +¥1,000 profit
  - +¥2,000 profit
  - +¥3,000 profit
  - 25% margin / 35% margin
  (Kisi bhi button par click karein, selling price automatically set ho jayega!)

### 5. 📊 Inventory & Profit Tracker (在庫・売上管理)
- **Status Pipeline**:
  - 🎯 検討中 (Watching / Considering)
  - 🛒 落札済 (Won / Ordered from Yahoo Auction)
  - 📦 在庫 (In Stock / Arrived)
  - 🏷️ 出品中 (Listed on Yahoo Flea Market)
  - 💰 売却済 (Sold & Completed)
- Inline status change: Ek click me status badal sakte hain.
- **KPI Metrics**: Total Revenue, Total Profit, Active Inventory Investment, Average Margin.
- **CSV Export**: Poora record Excel/Sheets ke liye download kar sakte hain.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn, BeautifulSoup4, Requests, Pydantic
- **Database**: SQLite3 (`inventory.db`) - 100% local, no configuration needed
- **Frontend**: Responsive Single-Page Application (HTML5, Tailwind CSS, Lucide Icons, Vanilla JavaScript)
- **Launcher**: Windows Batch (`run.bat`, `server.py`)

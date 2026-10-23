import sys
import unittest
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

class TestAppEndpoints(unittest.TestCase):

    def test_01_static_index(self):
        res = client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Yahoo! Auction", res.text)
        self.assertIn("Flea Market", res.text)

    def test_02_meta(self):
        res = client.get("/api/meta")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("shipping_methods", data)
        self.assertIn("platforms", data)
        self.assertIn("keyword_pills", data)

    def test_03_calculate(self):
        res = client.post("/api/calculate", json={
            "buy_price": 5000,
            "inbound_shipping": 750,
            "sell_price": 8500,
            "shipping_out": 210,
            "packaging_cost": 50,
            "platform": "yahoo_flea"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        calc = data["calc"]
        self.assertEqual(calc["buy_price"], 5000)
        self.assertEqual(calc["platform_fee"], 425) # 5% of 8500
        # total cost = 5000 + 750 + 210 + 50 + 425 = 6435
        # net profit = 8500 - 6435 = 2065
        self.assertEqual(calc["net_profit"], 2065)
        self.assertTrue(calc["is_profitable"])
        self.assertIn("suggestions", data)

    def test_04_format_description(self):
        res = client.post("/api/format-description", json={
            "template_id": "electronics",
            "title": "Nintendo Switch 本体",
            "condition": "目立った傷や汚れなし",
            "description": "初期化済みです。ノークレームノーリターンでお願いします。"
        })
        self.assertEqual(res.status_code, 200)
        formatted = res.json()["formatted"]
        self.assertIn("Nintendo Switch 本体", formatted)
        self.assertIn("動作確認", formatted)
        # Verify blacklisted auction phrase was stripped
        self.assertNotIn("ノークレームノーリターン", formatted)

    def test_05_inventory_crud_and_stats(self):
        # 1. Create item
        res = client.post("/api/items", json={
            "auction_id": "test_auc_001",
            "source_url": "https://auctions.yahoo.co.jp/jp/auction/test_auc_001",
            "title": "テスト商品 Nintendo Switch",
            "images": ["https://example.com/test.jpg"],
            "buy_price": 10000,
            "inbound_shipping": 850,
            "sell_price": 16000,
            "shipping_out": 750,
            "packaging_cost": 100,
            "platform": "yahoo_flea",
            "status": "listed"
        })
        self.assertEqual(res.status_code, 200)
        item_id = res.json()["id"]

        # 2. Get item
        res_get = client.get(f"/api/items/{item_id}")
        self.assertEqual(res_get.status_code, 200)
        item = res_get.json()
        self.assertEqual(item["auction_id"], "test_auc_001")
        self.assertEqual(item["status"], "listed")
        self.assertEqual(item["net_profit"], 3500) # 16000 - (10000+850+750+100+800 fee) = 3500

        # 3. Update status to sold
        res_put = client.put(f"/api/items/{item_id}", json={
            "status": "sold"
        })
        self.assertEqual(res_put.status_code, 200)

        # 4. Check stats
        res_stats = client.get("/api/stats")
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.json()
        self.assertGreaterEqual(stats["sold_count"], 1)
        self.assertGreaterEqual(stats["total_revenue"], 16000)
        self.assertGreaterEqual(stats["total_profit"], 3500)

        # 5. Delete item
        res_del = client.delete(f"/api/items/{item_id}")
        self.assertEqual(res_del.status_code, 200)

    def test_06_sellability_metrics(self):
        res = client.post("/api/sellability", json={
            "query": "DELL Vostro 3580 Core i5 SSD",
            "buy_price": 11000,
            "target_sell_price": 16800,
            "bids": 2
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("score", data)
        self.assertIn("units_sold_60d", data)
        self.assertIn("turnaround_speed", data)
        self.assertIn("sold_price_range", data)
        self.assertIn("sweet_spot", data)
        self.assertIn("proof_links", data)
        self.assertIn("paypay_sold", data["proof_links"])
        self.assertIn("velocity_breakdown", data)
        self.assertEqual(len(data["velocity_breakdown"]), 3)

    def test_07_product_suggestions(self):
        res = client.get("/api/suggestions")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        items = data["items"]
        self.assertGreaterEqual(len(items), 5)
        # Verify first suggestion has 60d metrics
        first = items[0]
        self.assertIn("units_sold_60d", first)
        self.assertIn("turnaround_speed", first)

    def test_08_flea_sold_api(self):
        res = client.get("/api/flea-sold?query=HP+ProBook+450+G9")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("count", data)

    def test_09_shipping_trap_protection(self):
        # Test 11 yen buy price with 1500 yen inbound shipping
        res = client.post("/api/calculate", json={
            "buy_price": 11,
            "inbound_shipping": 1500,
            "sell_price": 1120,
            "shipping_out": 210,
            "packaging_cost": 0,
            "platform": "yahoo_flea"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        calc = data["calc"]
        self.assertEqual(calc["buy_price"], 11)
        self.assertEqual(calc["inbound_shipping"], 1500)
        self.assertEqual(calc["procurement_cost"], 1511)
        # 1120 - 1511 - 56 (5% fee) - 210 = -657 (Loss!)
        self.assertEqual(calc["net_profit"], -657)
        self.assertFalse(calc["is_profitable"])

    def test_10_box_pricing_and_condition_detection(self):
        from backend.scraper import analyze_condition_and_defects
        
        # Test 1: Boxed item
        res_box = analyze_condition_and_defects("Nintendo Switch 箱付き 美品", "付属品完備", "目立った傷や汚れなし")
        self.assertTrue(res_box["has_box"])
        self.assertFalse(res_box["is_junk"])
        
        # Test 2: Unit only item
        res_loose = analyze_condition_and_defects("PS4 本体のみ コントローラーなし", "箱はありません", "やや傷や汚れあり")
        self.assertFalse(res_loose["has_box"])
        
        # Test 3: Calculate endpoint returns box_pricing
        res = client.post("/api/calculate", json={
            "buy_price": 10000,
            "inbound_shipping": 0,
            "sell_price": 15000,
            "shipping_out": 210,
            "packaging_cost": 0,
            "platform": "yahoo_flea",
            "has_box": True
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("box_pricing", data["suggestions"])
        box_p = data["suggestions"]["box_pricing"]
        self.assertGreater(box_p["price_with_box"], box_p["price_no_box"])
        self.assertEqual(box_p["has_box"], True)

    def test_11_junk_and_defect_extraction(self):
        from backend.scraper import analyze_condition_and_defects
        
        # Test JUNK detection
        res_junk = analyze_condition_and_defects(
            "通電確認のみ ジャンク品 SONY レコーダー 部品取り",
            "動作未確認のためジャンク扱いでお願いします",
            "全体的に状態が悪い"
        )
        self.assertTrue(res_junk["is_junk"])
        self.assertGreater(len(res_junk["junk_reasons"]), 0)
        
        # Test Damage / Defect extraction
        res_dmg = analyze_condition_and_defects(
            "Canon 一眼レフ EOS",
            "液晶画面にヒビ・割れがあります。ボタンが一部反応しにくいです。",
            "やや傷や汚れあり"
        )
        self.assertTrue(res_dmg["has_damage"])
        self.assertGreater(len(res_dmg["defects"]), 0)
        categories = [d["category"] for d in res_dmg["defects"]]
        self.assertIn("damage", categories)

    def test_12_main_flea_keyword_extraction(self):
        from backend.scraper import extract_main_flea_keyword
        
        # Test 1: Model number with brand and noise
        k1 = extract_main_flea_keyword("★極美品★ SONY ソニー ワイヤレスノイズキャンセリングヘッドホン WH-1000XM4 ブラック 動作確認済 即決")
        self.assertIn("WH-1000XM4", k1)
        self.assertNotIn("★", k1)
        self.assertNotIn("極美品", k1)
        self.assertNotIn("即決", k1)
        
        # Test 2: Console with model
        k2 = extract_main_flea_keyword("【動作良好】PS4 Pro 1TB CUH-7200B ジェットブラック 本体 送料無料")
        self.assertIn("CUH-7200B", k2)
        self.assertNotIn("送料無料", k2)
        self.assertNotIn("動作良好", k2)
        
        # Test 3: Nintendo Switch OLED
        k3 = extract_main_flea_keyword("【美品】Nintendo Switch 有機ELモデル ホワイト 本体 箱付き 動作確認済み 送料無料")
        self.assertIn("Nintendo", k3)
        self.assertIn("Switch", k3)
        self.assertNotIn("美品", k3)
        self.assertNotIn("送料無料", k3)
        
        # Test 4: Laptop model
        k4 = extract_main_flea_keyword("DELL Vostro 3580 Core i5 8GB SSD 256GB 15.6インチ 動作品")
        self.assertIn("3580", k4)
        self.assertNotIn("動作品", k4)

    def test_13_real_flea_sold_average_stats(self):
        from backend.market_radar import get_flea_market_real_sold_stats
        
        # Test 1: Real average of PS5 Digital Edition CFI-1200B
        # User screenshot proves real average is ~44,600 (not 64,000)
        stats = get_flea_market_real_sold_stats("プレイステーション5 デジタルエディション CFI-1200B", max_pages=2)
        self.assertTrue(stats["success"])
        self.assertGreater(stats["avg_sold_price"], 38000)
        self.assertLess(stats["avg_sold_price"], 52000)
        self.assertGreater(stats["sample_count"], 10)
        
        # Test 2: API flea-sold endpoint returns stats
        res = client.get("/api/flea-sold?query=PS4+Pro+CUH-7200B")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("stats", data)
        self.assertGreater(data["stats"]["avg_sold_price"], 10000)

if __name__ == "__main__":
    unittest.main()

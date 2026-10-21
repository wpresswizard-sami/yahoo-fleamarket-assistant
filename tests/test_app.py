import sys
import unittest
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

class TestAppEndpoints(unittest.TestCase):

    def test_01_static_index(self):
        res = client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("ヤフオク → Yahoo!フリマ", res.text)

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

if __name__ == "__main__":
    unittest.main()

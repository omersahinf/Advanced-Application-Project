"""Seed data matching the Spring Boot DataSeeder — ensures both services share the same data."""
import random
from datetime import datetime, timedelta
from database import engine, metadata, init_db, users, categories, stores, products, orders, order_items, shipments, reviews, customer_profiles
from sqlalchemy import insert, select

random.seed(42)

def seed():
    init_db()
    with engine.connect() as conn:
        existing = conn.execute(select(users)).fetchall()
        if existing:
            print("Database already seeded.")
            return

        now = datetime.now()

        # ======= CATEGORIES (hierarchical, 22 total) =======
        conn.execute(insert(categories), [
            {"id": 1, "name": "Electronics", "parent_id": None},
            {"id": 2, "name": "Computers & Accessories", "parent_id": 1},
            {"id": 3, "name": "Phones & Tablets", "parent_id": 1},
            {"id": 4, "name": "Audio & Video", "parent_id": 1},
            {"id": 5, "name": "Wearables", "parent_id": 1},
            {"id": 6, "name": "Fashion", "parent_id": None},
            {"id": 7, "name": "Men's Fashion", "parent_id": 6},
            {"id": 8, "name": "Women's Fashion", "parent_id": 6},
            {"id": 9, "name": "Shoes & Footwear", "parent_id": 6},
            {"id": 10, "name": "Home & Garden", "parent_id": None},
            {"id": 11, "name": "Kitchen", "parent_id": 10},
            {"id": 12, "name": "Furniture", "parent_id": 10},
            {"id": 13, "name": "Home Decor", "parent_id": 10},
            {"id": 14, "name": "Beauty & Personal Care", "parent_id": None},
            {"id": 15, "name": "Skincare", "parent_id": 14},
            {"id": 16, "name": "Haircare", "parent_id": 14},
            {"id": 17, "name": "Food & Beverages", "parent_id": None},
            {"id": 18, "name": "Organic", "parent_id": 17},
            {"id": 19, "name": "Snacks", "parent_id": 17},
            {"id": 20, "name": "Sports & Outdoors", "parent_id": None},
            {"id": 21, "name": "Fitness", "parent_id": 20},
            {"id": 22, "name": "Books & Media", "parent_id": None},
        ])

        # ======= USERS (25 total: 1 admin, 4 corporate, 20 individual) =======
        first_names = ["Alice","Bob","Charlie","Diana","Edward","Fiona","George","Hannah","Ivan","Julia",
                       "Kevin","Laura","Marcus","Nina","Oscar","Patricia","Quinn","Rachel","Steve","Tina"]
        last_names = ["Johnson","Williams","Brown","Davis","Miller","Garcia","Martinez","Anderson","Taylor","Thomas",
                      "Jackson","White","Harris","Martin","Thompson","Robinson","Clark","Lewis","Lee","Walker"]
        cities = ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio",
                  "San Diego","Dallas","San Jose","Austin","Seattle","Denver","Boston"]
        genders_list = ["Male","Female","Male","Female","Male","Female","Male","Female","Male","Female",
                        "Male","Female","Male","Female","Male","Female","Male","Female","Male","Female"]
        memberships = ["GOLD","SILVER","BRONZE","GOLD","SILVER","BRONZE","GOLD","SILVER","BRONZE","GOLD",
                       "SILVER","BRONZE","GOLD","SILVER","BRONZE","SILVER","BRONZE","GOLD","SILVER","BRONZE"]

        user_rows = [
            {"id": 1, "first_name": "Admin", "last_name": "Manager", "email": "admin@example.com", "password_hash": "", "role_type": "ADMIN", "gender": "Male", "created_at": now},
            {"id": 2, "first_name": "John", "last_name": "Doe", "email": "corporate1@example.com", "password_hash": "", "role_type": "CORPORATE", "gender": "Male", "created_at": now},
            {"id": 3, "first_name": "Jane", "last_name": "Smith", "email": "corporate2@example.com", "password_hash": "", "role_type": "CORPORATE", "gender": "Female", "created_at": now},
            {"id": 4, "first_name": "Michael", "last_name": "Chen", "email": "corporate3@example.com", "password_hash": "", "role_type": "CORPORATE", "gender": "Male", "created_at": now},
            {"id": 5, "first_name": "Sarah", "last_name": "Wilson", "email": "corporate4@example.com", "password_hash": "", "role_type": "CORPORATE", "gender": "Female", "created_at": now},
        ]
        for i in range(20):
            user_rows.append({
                "id": 6 + i, "first_name": first_names[i], "last_name": last_names[i],
                "email": f"user{i+1}@example.com", "password_hash": "",
                "role_type": "INDIVIDUAL", "gender": genders_list[i], "created_at": now
            })
        conn.execute(insert(users), user_rows)

        # ======= STORES (4 total) =======
        conn.execute(insert(stores), [
            {"id": 1, "owner_id": 2, "name": "TechCorp", "description": "Premium electronics and tech accessories", "status": "ACTIVE", "created_at": now},
            {"id": 2, "owner_id": 3, "name": "GreenMarket", "description": "Eco-friendly and organic products", "status": "ACTIVE", "created_at": now},
            {"id": 3, "owner_id": 4, "name": "FashionHub", "description": "Trendy fashion and lifestyle products", "status": "ACTIVE", "created_at": now},
            {"id": 4, "owner_id": 5, "name": "HomeEssentials", "description": "Quality home and kitchen products", "status": "ACTIVE", "created_at": now},
        ])

        # ======= PRODUCTS (40 total: 12 tech, 10 green, 8 fashion, 10 home) =======
        conn.execute(insert(products), [
            # TechCorp (store 1)
            {"id": 1,  "store_id": 1, "category_id": 2,  "sku": "TC-001", "name": "Wireless Keyboard Pro", "description": "Ergonomic wireless keyboard with backlight and rechargeable battery", "unit_price": 79.99, "stock": 150, "created_at": now},
            {"id": 2,  "store_id": 1, "category_id": 2,  "sku": "TC-002", "name": "Gaming Mouse X500", "description": "High-precision 16000 DPI gaming mouse with RGB lighting", "unit_price": 49.99, "stock": 85, "created_at": now},
            {"id": 3,  "store_id": 1, "category_id": 2,  "sku": "TC-003", "name": "USB-C Hub 7-in-1", "description": "USB-C hub with HDMI, ethernet, SD card reader", "unit_price": 39.99, "stock": 200, "created_at": now},
            {"id": 4,  "store_id": 1, "category_id": 2,  "sku": "TC-004", "name": "Laptop Stand Aluminum", "description": "Adjustable aluminum laptop stand with ventilation", "unit_price": 29.99, "stock": 120, "created_at": now},
            {"id": 5,  "store_id": 1, "category_id": 2,  "sku": "TC-005", "name": "Webcam HD 1080p", "description": "1080p webcam with noise-canceling microphone", "unit_price": 89.99, "stock": 45, "created_at": now},
            {"id": 6,  "store_id": 1, "category_id": 2,  "sku": "TC-006", "name": "Monitor Arm Single", "description": "Single monitor desk mount arm, VESA compatible", "unit_price": 34.99, "stock": 60, "created_at": now},
            {"id": 7,  "store_id": 1, "category_id": 2,  "sku": "TC-007", "name": "Mechanical Keyboard MX", "description": "Cherry MX Blue switches with RGB backlighting", "unit_price": 129.99, "stock": 35, "created_at": now},
            {"id": 8,  "store_id": 1, "category_id": 3,  "sku": "TC-008", "name": "Phone Case Premium", "description": "Shockproof premium case with MagSafe support", "unit_price": 24.99, "stock": 300, "created_at": now},
            {"id": 9,  "store_id": 1, "category_id": 4,  "sku": "TC-009", "name": "Wireless Earbuds Pro", "description": "Active noise cancellation, 30hr battery life", "unit_price": 149.99, "stock": 90, "created_at": now},
            {"id": 10, "store_id": 1, "category_id": 5,  "sku": "TC-010", "name": "Smart Watch Series X", "description": "Health tracking, GPS, water resistant", "unit_price": 299.99, "stock": 40, "created_at": now},
            {"id": 11, "store_id": 1, "category_id": 4,  "sku": "TC-011", "name": "Bluetooth Speaker", "description": "Portable 20W speaker with 12hr battery", "unit_price": 59.99, "stock": 110, "created_at": now},
            {"id": 12, "store_id": 1, "category_id": 2,  "sku": "TC-012", "name": "External SSD 1TB", "description": "USB 3.2 Gen2 portable SSD, 1050MB/s", "unit_price": 89.99, "stock": 75, "created_at": now},
            # GreenMarket (store 2)
            {"id": 13, "store_id": 2, "category_id": 18, "sku": "GM-001", "name": "Organic Green Tea", "description": "Premium Japanese matcha green tea 100g", "unit_price": 24.99, "stock": 300, "created_at": now},
            {"id": 14, "store_id": 2, "category_id": 14, "sku": "GM-002", "name": "Bamboo Toothbrush Set", "description": "Pack of 4 biodegradable bamboo toothbrushes", "unit_price": 12.99, "stock": 250, "created_at": now},
            {"id": 15, "store_id": 2, "category_id": 10, "sku": "GM-003", "name": "Reusable Water Bottle", "description": "Stainless steel 750ml insulated bottle", "unit_price": 19.99, "stock": 180, "created_at": now},
            {"id": 16, "store_id": 2, "category_id": 18, "sku": "GM-004", "name": "Organic Raw Honey", "description": "Raw unfiltered wildflower honey 500g", "unit_price": 14.99, "stock": 160, "created_at": now},
            {"id": 17, "store_id": 2, "category_id": 6,  "sku": "GM-005", "name": "Hemp Backpack", "description": "Eco-friendly hemp fiber backpack", "unit_price": 59.99, "stock": 65, "created_at": now},
            {"id": 18, "store_id": 2, "category_id": 10, "sku": "GM-006", "name": "Soy Candle Set", "description": "Lavender scented soy wax candles, set of 3", "unit_price": 22.99, "stock": 140, "created_at": now},
            {"id": 19, "store_id": 2, "category_id": 15, "sku": "GM-007", "name": "Natural Face Cream", "description": "Organic aloe vera moisturizer 100ml", "unit_price": 18.99, "stock": 200, "created_at": now},
            {"id": 20, "store_id": 2, "category_id": 18, "sku": "GM-008", "name": "Quinoa Organic 1kg", "description": "Premium organic quinoa grain", "unit_price": 11.99, "stock": 220, "created_at": now},
            {"id": 21, "store_id": 2, "category_id": 19, "sku": "GM-009", "name": "Trail Mix Organic", "description": "Mixed nuts and dried fruits 500g", "unit_price": 9.99, "stock": 190, "created_at": now},
            {"id": 22, "store_id": 2, "category_id": 16, "sku": "GM-010", "name": "Argan Oil Shampoo", "description": "Sulfate-free argan oil shampoo 300ml", "unit_price": 15.99, "stock": 170, "created_at": now},
            # FashionHub (store 3)
            {"id": 23, "store_id": 3, "category_id": 7,  "sku": "FH-001", "name": "Classic Cotton T-Shirt", "description": "100% organic cotton crew neck tee", "unit_price": 29.99, "stock": 500, "created_at": now},
            {"id": 24, "store_id": 3, "category_id": 9,  "sku": "FH-002", "name": "Running Sneakers Pro", "description": "Lightweight cushioned running shoes", "unit_price": 89.99, "stock": 120, "created_at": now},
            {"id": 25, "store_id": 3, "category_id": 8,  "sku": "FH-003", "name": "Designer Sunglasses", "description": "UV400 polarized designer sunglasses", "unit_price": 129.99, "stock": 80, "created_at": now},
            {"id": 26, "store_id": 3, "category_id": 7,  "sku": "FH-004", "name": "Slim Fit Jeans", "description": "Stretch denim slim fit jeans", "unit_price": 54.99, "stock": 200, "created_at": now},
            {"id": 27, "store_id": 3, "category_id": 8,  "sku": "FH-005", "name": "Leather Handbag", "description": "Genuine leather crossbody handbag", "unit_price": 199.99, "stock": 45, "created_at": now},
            {"id": 28, "store_id": 3, "category_id": 9,  "sku": "FH-006", "name": "Canvas Sneakers", "description": "Classic canvas low-top sneakers", "unit_price": 39.99, "stock": 180, "created_at": now},
            {"id": 29, "store_id": 3, "category_id": 8,  "sku": "FH-007", "name": "Summer Dress Floral", "description": "Lightweight floral print summer dress", "unit_price": 44.99, "stock": 150, "created_at": now},
            {"id": 30, "store_id": 3, "category_id": 7,  "sku": "FH-008", "name": "Wool Sweater", "description": "Merino wool crewneck sweater", "unit_price": 69.99, "stock": 90, "created_at": now},
            # HomeEssentials (store 4)
            {"id": 31, "store_id": 4, "category_id": 11, "sku": "HE-001", "name": "Chef Knife Set", "description": "8-piece professional chef knife set", "unit_price": 79.99, "stock": 70, "created_at": now},
            {"id": 32, "store_id": 4, "category_id": 12, "sku": "HE-002", "name": "Bookshelf Oak", "description": "5-tier solid oak bookshelf", "unit_price": 149.99, "stock": 30, "created_at": now},
            {"id": 33, "store_id": 4, "category_id": 11, "sku": "HE-003", "name": "Coffee Maker Pro", "description": "12-cup programmable coffee maker", "unit_price": 69.99, "stock": 95, "created_at": now},
            {"id": 34, "store_id": 4, "category_id": 13, "sku": "HE-004", "name": "LED Desk Lamp", "description": "Adjustable LED desk lamp with USB port", "unit_price": 34.99, "stock": 160, "created_at": now},
            {"id": 35, "store_id": 4, "category_id": 11, "sku": "HE-005", "name": "Blender 1200W", "description": "High-speed professional blender", "unit_price": 59.99, "stock": 80, "created_at": now},
            {"id": 36, "store_id": 4, "category_id": 13, "sku": "HE-006", "name": "Wall Art Canvas", "description": "Abstract modern canvas wall art set", "unit_price": 44.99, "stock": 55, "created_at": now},
            {"id": 37, "store_id": 4, "category_id": 12, "sku": "HE-007", "name": "Office Chair Ergonomic", "description": "Mesh back ergonomic office chair", "unit_price": 189.99, "stock": 40, "created_at": now},
            {"id": 38, "store_id": 4, "category_id": 11, "sku": "HE-008", "name": "Cast Iron Skillet", "description": "Pre-seasoned 12-inch cast iron skillet", "unit_price": 39.99, "stock": 130, "created_at": now},
            {"id": 39, "store_id": 4, "category_id": 13, "sku": "HE-009", "name": "Throw Pillow Set", "description": "Set of 4 decorative throw pillows", "unit_price": 29.99, "stock": 100, "created_at": now},
            {"id": 40, "store_id": 4, "category_id": 21, "sku": "HE-010", "name": "Yoga Mat Premium", "description": "Non-slip 6mm premium yoga mat", "unit_price": 24.99, "stock": 200, "created_at": now},
        ])

        # ======= ORDERS (from DS1/DS4/DS5: ~80 orders across 20 individual users) =======
        store_product_ids = {
            1: list(range(1, 13)),   # TechCorp: products 1-12
            2: list(range(13, 23)),  # GreenMarket: products 13-22
            3: list(range(23, 31)),  # FashionHub: products 23-30
            4: list(range(31, 41)),  # HomeEssentials: products 31-40
        }
        product_prices = {
            1: 79.99, 2: 49.99, 3: 39.99, 4: 29.99, 5: 89.99, 6: 34.99, 7: 129.99, 8: 24.99, 9: 149.99, 10: 299.99, 11: 59.99, 12: 89.99,
            13: 24.99, 14: 12.99, 15: 19.99, 16: 14.99, 17: 59.99, 18: 22.99, 19: 18.99, 20: 11.99, 21: 9.99, 22: 15.99,
            23: 29.99, 24: 89.99, 25: 129.99, 26: 54.99, 27: 199.99, 28: 39.99, 29: 44.99, 30: 69.99,
            31: 79.99, 32: 149.99, 33: 69.99, 34: 34.99, 35: 59.99, 36: 44.99, 37: 189.99, 38: 39.99, 39: 29.99, 40: 24.99,
        }

        statuses = ["DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "CONFIRMED", "PENDING", "CANCELLED"]
        payments = ["CREDIT_CARD", "DEBIT_CARD", "PAYPAL", "BANK_TRANSFER", "CREDIT_CARD"]
        channels = ["WEB", "MOBILE", "WEB", "MOBILE", "IN_STORE"]
        fulfilments = ["WAREHOUSE", "STORE", "DROPSHIP", "WAREHOUSE"]
        warehouses = ["Block A", "Block B", "Block C", "Block D", "Block F"]
        modes_list = ["Road", "Flight", "Ship", "Road", "Road"]
        carriers_list = ["FedEx", "UPS", "DHL", "USPS", "FedEx"]

        order_id = 0
        order_rows = []
        item_rows = []
        shipment_rows = []

        for u_idx in range(20):
            user_id = 6 + u_idx
            num_orders = 2 + random.randint(0, 3)
            for _ in range(num_orders):
                order_id += 1
                store_id = random.randint(1, 4)
                status = random.choice(statuses)
                payment = random.choice(payments)
                channel = random.choice(channels)
                fulfilment = random.choice(fulfilments)
                order_date = now - timedelta(days=1 + random.randint(0, 119))

                # 1-4 items
                num_items = 1 + random.randint(0, 3)
                avail = store_product_ids[store_id][:]
                random.shuffle(avail)
                chosen = avail[:num_items]
                total = 0.0

                for prod_id in chosen:
                    qty = 1 + random.randint(0, 2)
                    price = product_prices[prod_id]
                    disc = (5 + random.randint(0, 15)) if random.randint(0, 4) == 0 else 0
                    item_total = price * qty * (1 - disc / 100.0)
                    total += item_total
                    item_rows.append({
                        "order_id": order_id, "product_id": prod_id,
                        "quantity": qty, "price": price, "discount_percent": disc
                    })

                order_rows.append({
                    "id": order_id, "user_id": user_id, "store_id": store_id,
                    "status": status, "grand_total": round(total, 2),
                    "payment_method": payment, "sales_channel": channel,
                    "fulfilment": fulfilment, "order_date": order_date
                })

                # Shipment for non-PENDING/CANCELLED
                if status not in ("PENDING", "CANCELLED"):
                    ship_status = "DELIVERED" if status == "DELIVERED" else ("IN_TRANSIT" if status == "SHIPPED" else "PROCESSING")
                    shipped_date = order_date + timedelta(days=1)
                    est_arrival = order_date + timedelta(days=5)
                    delivered_date = (order_date + timedelta(days=3 + random.randint(0, 3))) if status == "DELIVERED" else None
                    shipment_rows.append({
                        "order_id": order_id,
                        "warehouse": random.choice(warehouses),
                        "mode": random.choice(modes_list),
                        "status": ship_status,
                        "tracking_number": f"TRK-{800000 + order_id}",
                        "carrier": random.choice(carriers_list),
                        "destination": cities[u_idx % len(cities)],
                        "customer_care_calls": random.randint(0, 4),
                        "shipped_date": shipped_date,
                        "estimated_arrival": est_arrival,
                        "delivered_date": delivered_date,
                    })

        conn.execute(insert(orders), order_rows)
        conn.execute(insert(order_items), item_rows)
        conn.execute(insert(shipments), shipment_rows)

        # ======= REVIEWS (from DS6: ~120-160 reviews across all 40 products) =======
        review_templates = [
            (5, "POSITIVE", "Absolutely fantastic product! Exceeded all my expectations."),
            (5, "POSITIVE", "Best purchase I've made this year. Highly recommended!"),
            (5, "POSITIVE", "Perfect quality, fast shipping. Will buy again."),
            (4, "POSITIVE", "Great product overall, minor improvements possible."),
            (4, "POSITIVE", "Good value for money. Very satisfied with the purchase."),
            (4, "POSITIVE", "Works exactly as described. Happy with this buy."),
            (3, "NEUTRAL", "Decent product for the price. Nothing extraordinary."),
            (3, "NEUTRAL", "Average quality. Does the job but nothing special."),
            (3, "NEUTRAL", "It's okay. Met my basic expectations."),
            (2, "NEGATIVE", "Not what I expected. Quality could be much better."),
            (2, "NEGATIVE", "Disappointed with the build quality. Feels cheap."),
            (1, "NEGATIVE", "Terrible product. Broke after first use. Don't buy."),
            (5, "POSITIVE", "Outstanding quality and great customer service!"),
            (4, "POSITIVE", "Really nice product. Shipping was a bit slow though."),
            (3, "NEUTRAL", "Looks different from photos. Acceptable quality."),
        ]

        review_rows = []
        individual_ids = list(range(6, 26))  # user IDs 6-25
        for prod_id in range(1, 41):
            num_reviews = 2 + random.randint(0, 4)
            reviewers = random.sample(individual_ids, min(num_reviews, len(individual_ids)))
            for reviewer_id in reviewers[:num_reviews]:
                tmpl = random.choice(review_templates)
                review_rows.append({
                    "user_id": reviewer_id, "product_id": prod_id,
                    "star_rating": tmpl[0], "review_body": tmpl[2], "sentiment": tmpl[1],
                    "helpful_votes": random.randint(0, 49),
                    "total_votes": random.randint(0, 49) + random.randint(0, 19),
                    "review_date": now - timedelta(days=random.randint(0, 89)),
                })
        conn.execute(insert(reviews), review_rows)

        # ======= CUSTOMER PROFILES (20 individual users) =======
        satisfaction_levels = ["Satisfied", "Neutral", "Unsatisfied"]
        profile_rows = []
        for i in range(20):
            profile_rows.append({
                "user_id": 6 + i,
                "age": 18 + random.randint(0, 46),
                "city": cities[i % len(cities)],
                "membership_type": memberships[i],
                "total_spend": round(100 + random.randint(0, 4900), 2),
                "items_purchased": 2 + random.randint(0, 27),
                "avg_rating": round(3.0 + random.random() * 2.0, 2),
                "discount_applied": random.choice([True, False]),
                "satisfaction_level": random.choice(satisfaction_levels),
                "prior_purchases": random.randint(0, 19),
            })
        conn.execute(insert(customer_profiles), profile_rows)

        conn.commit()
        print("=== Chatbot database seeded successfully ===")
        print(f"  Users: 25 (1 admin, 4 corporate, 20 individual)")
        print(f"  Stores: 4 (TechCorp, GreenMarket, FashionHub, HomeEssentials)")
        print(f"  Products: 40")
        print(f"  Orders: {len(order_rows)}")
        print(f"  Reviews: {len(review_rows)}")
        print(f"  Customer Profiles: 20")


if __name__ == "__main__":
    seed()

package com.demo.ecommerce.config;

import com.demo.ecommerce.entity.*;
import com.demo.ecommerce.repository.*;
import static com.demo.ecommerce.entity.OrderStatus.*;
import static com.demo.ecommerce.entity.ShipmentStatus.*;
import static com.demo.ecommerce.entity.StoreStatus.*;
import static com.demo.ecommerce.entity.Sentiment.*;
import static com.demo.ecommerce.entity.MembershipType.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Comprehensive data seeder simulating ETL from 6 Kaggle datasets:
 * DS1: UCI Online Retail (Orders, OrderItems, Products)
 * DS2: E-Commerce Customer Behavior (Users, CustomerProfiles)
 * DS3: E-Commerce Shipping Data (Shipments)
 * DS4: Amazon Sales (Order status/fulfilment)
 * DS5: Pakistan E-Commerce (Orders, PaymentMethods)
 * DS6: Amazon US Customer Reviews (Reviews, Sentiment)
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShipmentRepository shipmentRepository;
    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;

    private final Random random = new Random(42);

    public DataSeeder(UserRepository userRepository, StoreRepository storeRepository,
                      CategoryRepository categoryRepository, ProductRepository productRepository,
                      CustomerProfileRepository customerProfileRepository,
                      OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                      ShipmentRepository shipmentRepository, ReviewRepository reviewRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.shipmentRepository = shipmentRepository;
        this.reviewRepository = reviewRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;

        // ======= CATEGORIES (hierarchical, from DS1/DS4 product categories) =======
        Category electronics = cat("Electronics", null);
        Category computers = cat("Computers & Accessories", electronics);
        Category phones = cat("Phones & Tablets", electronics);
        Category audioVideo = cat("Audio & Video", electronics);
        Category wearables = cat("Wearables", electronics);

        Category fashion = cat("Fashion", null);
        Category mensFashion = cat("Men's Fashion", fashion);
        Category womensFashion = cat("Women's Fashion", fashion);
        Category shoes = cat("Shoes & Footwear", fashion);

        Category home = cat("Home & Garden", null);
        Category kitchen = cat("Kitchen", home);
        Category furniture = cat("Furniture", home);
        Category decor = cat("Home Decor", home);

        Category beauty = cat("Beauty & Personal Care", null);
        Category skincare = cat("Skincare", beauty);
        Category haircare = cat("Haircare", beauty);

        Category food = cat("Food & Beverages", null);
        Category organic = cat("Organic", food);
        Category snacks = cat("Snacks", food);

        Category sports = cat("Sports & Outdoors", null);
        Category fitness = cat("Fitness", sports);

        cat("Books & Media", null);

        // ======= USERS (from DS2: Customer Behavior) =======
        String encodedPw = passwordEncoder.encode("123");

        // Admin
        createUser("Admin", "Manager", "admin@example.com", encodedPw, RoleType.ADMIN, "Male");

        // Corporate Users (store owners)
        User corp1 = createUser("John", "Doe", "corporate1@example.com", encodedPw, RoleType.CORPORATE, "Male");
        User corp2 = createUser("Jane", "Smith", "corporate2@example.com", encodedPw, RoleType.CORPORATE, "Female");
        User corp3 = createUser("Michael", "Chen", "corporate3@example.com", encodedPw, RoleType.CORPORATE, "Male");
        User corp4 = createUser("Sarah", "Wilson", "corporate4@example.com", encodedPw, RoleType.CORPORATE, "Female");

        // Individual Users (from DS2: demographics, membership, behavior)
        String[] firstNames = {"Alice","Bob","Charlie","Diana","Edward","Fiona","George","Hannah","Ivan","Julia",
                "Kevin","Laura","Marcus","Nina","Oscar","Patricia","Quinn","Rachel","Steve","Tina"};
        String[] lastNames = {"Johnson","Williams","Brown","Davis","Miller","Garcia","Martinez","Anderson","Taylor","Thomas",
                "Jackson","White","Harris","Martin","Thompson","Robinson","Clark","Lewis","Lee","Walker"};
        String[] cities = {"New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio",
                "San Diego","Dallas","San Jose","Austin","Seattle","Denver","Boston"};
        String[] genders = {"Male","Female","Male","Female","Male","Female","Male","Female","Male","Female",
                "Male","Female","Male","Female","Male","Female","Male","Female","Male","Female"};
        MembershipType[] memberships = {GOLD,SILVER,BRONZE,GOLD,SILVER,BRONZE,GOLD,SILVER,BRONZE,GOLD,
                SILVER,BRONZE,GOLD,SILVER,BRONZE,SILVER,BRONZE,GOLD,SILVER,BRONZE};

        List<User> individuals = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            User u = createUser(firstNames[i], lastNames[i],
                    "user" + (i + 1) + "@example.com", encodedPw, RoleType.INDIVIDUAL, genders[i]);
            individuals.add(u);

            int age = 18 + random.nextInt(47);
            BigDecimal spend = BigDecimal.valueOf(100 + random.nextInt(4900)).setScale(2);
            int items = 2 + random.nextInt(28);

            CustomerProfile cp = new CustomerProfile();
            cp.setOwner(u);
            cp.setAge(age);
            cp.setCity(cities[i % cities.length]);
            cp.setMembershipType(memberships[i]);
            cp.setTotalSpend(spend);
            cp.setItemsPurchased(items);
            cp.setAvgRating(BigDecimal.valueOf(3.0 + random.nextDouble() * 2.0).setScale(2, java.math.RoundingMode.HALF_UP));
            cp.setDiscountApplied(random.nextBoolean());
            cp.setSatisfactionLevel(random.nextInt(3) == 0 ? "Unsatisfied" : random.nextInt(2) == 0 ? "Neutral" : "Satisfied");
            cp.setPriorPurchases(random.nextInt(20));
            customerProfileRepository.save(cp);
        }

        // ======= STORES =======
        Store techCorp = createStore(corp1, "TechCorp", "Premium electronics and tech accessories", StoreStatus.ACTIVE);
        Store greenMarket = createStore(corp2, "GreenMarket", "Eco-friendly and organic products", StoreStatus.ACTIVE);
        Store fashionHub = createStore(corp3, "FashionHub", "Trendy fashion and lifestyle products", StoreStatus.ACTIVE);
        Store homeEssentials = createStore(corp4, "HomeEssentials", "Quality home and kitchen products", StoreStatus.ACTIVE);

        // ======= PRODUCTS (from DS1: StockCode/Description, DS3: CostOfProduct, DS4: SKU/Category, DS5: Price, DS6: ProductTitle) =======
        // TechCorp products
        List<Product> techProducts = new ArrayList<>();
        techProducts.add(prod(techCorp, computers, "TC-001", "Wireless Keyboard Pro", "Ergonomic wireless keyboard with backlight and rechargeable battery", "79.99", 150));
        techProducts.add(prod(techCorp, computers, "TC-002", "Gaming Mouse X500", "High-precision 16000 DPI gaming mouse with RGB lighting", "49.99", 85));
        techProducts.add(prod(techCorp, computers, "TC-003", "USB-C Hub 7-in-1", "USB-C hub with HDMI, ethernet, SD card reader", "39.99", 200));
        techProducts.add(prod(techCorp, computers, "TC-004", "Laptop Stand Aluminum", "Adjustable aluminum laptop stand with ventilation", "29.99", 120));
        techProducts.add(prod(techCorp, computers, "TC-005", "Webcam HD 1080p", "1080p webcam with noise-canceling microphone", "89.99", 45));
        techProducts.add(prod(techCorp, computers, "TC-006", "Monitor Arm Single", "Single monitor desk mount arm, VESA compatible", "34.99", 60));
        techProducts.add(prod(techCorp, computers, "TC-007", "Mechanical Keyboard MX", "Cherry MX Blue switches with RGB backlighting", "129.99", 35));
        techProducts.add(prod(techCorp, phones, "TC-008", "Phone Case Premium", "Shockproof premium case with MagSafe support", "24.99", 300));
        techProducts.add(prod(techCorp, audioVideo, "TC-009", "Wireless Earbuds Pro", "Active noise cancellation, 30hr battery life", "149.99", 90));
        techProducts.add(prod(techCorp, wearables, "TC-010", "Smart Watch Series X", "Health tracking, GPS, water resistant", "299.99", 40));
        techProducts.add(prod(techCorp, audioVideo, "TC-011", "Bluetooth Speaker", "Portable 20W speaker with 12hr battery", "59.99", 110));
        techProducts.add(prod(techCorp, computers, "TC-012", "External SSD 1TB", "USB 3.2 Gen2 portable SSD, 1050MB/s", "89.99", 75));

        // GreenMarket products
        List<Product> greenProducts = new ArrayList<>();
        greenProducts.add(prod(greenMarket, organic, "GM-001", "Organic Green Tea", "Premium Japanese matcha green tea 100g", "24.99", 300));
        greenProducts.add(prod(greenMarket, beauty, "GM-002", "Bamboo Toothbrush Set", "Pack of 4 biodegradable bamboo toothbrushes", "12.99", 250));
        greenProducts.add(prod(greenMarket, home, "GM-003", "Reusable Water Bottle", "Stainless steel 750ml insulated bottle", "19.99", 180));
        greenProducts.add(prod(greenMarket, organic, "GM-004", "Organic Raw Honey", "Raw unfiltered wildflower honey 500g", "14.99", 160));
        greenProducts.add(prod(greenMarket, fashion, "GM-005", "Hemp Backpack", "Eco-friendly hemp fiber backpack", "59.99", 65));
        greenProducts.add(prod(greenMarket, home, "GM-006", "Soy Candle Set", "Lavender scented soy wax candles, set of 3", "22.99", 140));
        greenProducts.add(prod(greenMarket, skincare, "GM-007", "Natural Face Cream", "Organic aloe vera moisturizer 100ml", "18.99", 200));
        greenProducts.add(prod(greenMarket, organic, "GM-008", "Quinoa Organic 1kg", "Premium organic quinoa grain", "11.99", 220));
        greenProducts.add(prod(greenMarket, snacks, "GM-009", "Trail Mix Organic", "Mixed nuts and dried fruits 500g", "9.99", 190));
        greenProducts.add(prod(greenMarket, haircare, "GM-010", "Argan Oil Shampoo", "Sulfate-free argan oil shampoo 300ml", "15.99", 170));

        // FashionHub products
        List<Product> fashionProducts = new ArrayList<>();
        fashionProducts.add(prod(fashionHub, mensFashion, "FH-001", "Classic Cotton T-Shirt", "100% organic cotton crew neck tee", "29.99", 500));
        fashionProducts.add(prod(fashionHub, shoes, "FH-002", "Running Sneakers Pro", "Lightweight cushioned running shoes", "89.99", 120));
        fashionProducts.add(prod(fashionHub, womensFashion, "FH-003", "Designer Sunglasses", "UV400 polarized designer sunglasses", "129.99", 80));
        fashionProducts.add(prod(fashionHub, mensFashion, "FH-004", "Slim Fit Jeans", "Stretch denim slim fit jeans", "54.99", 200));
        fashionProducts.add(prod(fashionHub, womensFashion, "FH-005", "Leather Handbag", "Genuine leather crossbody handbag", "199.99", 45));
        fashionProducts.add(prod(fashionHub, shoes, "FH-006", "Canvas Sneakers", "Classic canvas low-top sneakers", "39.99", 180));
        fashionProducts.add(prod(fashionHub, womensFashion, "FH-007", "Summer Dress Floral", "Lightweight floral print summer dress", "44.99", 150));
        fashionProducts.add(prod(fashionHub, mensFashion, "FH-008", "Wool Sweater", "Merino wool crewneck sweater", "69.99", 90));

        // HomeEssentials products
        List<Product> homeProducts = new ArrayList<>();
        homeProducts.add(prod(homeEssentials, kitchen, "HE-001", "Chef Knife Set", "8-piece professional chef knife set", "79.99", 70));
        homeProducts.add(prod(homeEssentials, furniture, "HE-002", "Bookshelf Oak", "5-tier solid oak bookshelf", "149.99", 30));
        homeProducts.add(prod(homeEssentials, kitchen, "HE-003", "Coffee Maker Pro", "12-cup programmable coffee maker", "69.99", 95));
        homeProducts.add(prod(homeEssentials, decor, "HE-004", "LED Desk Lamp", "Adjustable LED desk lamp with USB port", "34.99", 160));
        homeProducts.add(prod(homeEssentials, kitchen, "HE-005", "Blender 1200W", "High-speed professional blender", "59.99", 80));
        homeProducts.add(prod(homeEssentials, decor, "HE-006", "Wall Art Canvas", "Abstract modern canvas wall art set", "44.99", 55));
        homeProducts.add(prod(homeEssentials, furniture, "HE-007", "Office Chair Ergonomic", "Mesh back ergonomic office chair", "189.99", 40));
        homeProducts.add(prod(homeEssentials, kitchen, "HE-008", "Cast Iron Skillet", "Pre-seasoned 12-inch cast iron skillet", "39.99", 130));
        homeProducts.add(prod(homeEssentials, decor, "HE-009", "Throw Pillow Set", "Set of 4 decorative throw pillows", "29.99", 100));
        homeProducts.add(prod(homeEssentials, fitness, "HE-010", "Yoga Mat Premium", "Non-slip 6mm premium yoga mat", "24.99", 200));

        List<List<Product>> allStoreProducts = List.of(techProducts, greenProducts, fashionProducts, homeProducts);
        List<Store> allStores = List.of(techCorp, greenMarket, fashionHub, homeEssentials);

        // ======= ORDERS (from DS1: InvoiceNo/Date, DS4: Status/Fulfilment, DS5: PaymentMethod) =======
        OrderStatus[] statuses = {OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.SHIPPED, CONFIRMED, OrderStatus.PENDING, CANCELLED};
        String[] payments = {"CREDIT_CARD", "DEBIT_CARD", "PAYPAL", "BANK_TRANSFER", "CREDIT_CARD"};
        String[] channels = {"WEB", "MOBILE", "WEB", "MOBILE", "IN_STORE"};
        String[] fulfilments = {"WAREHOUSE", "STORE", "DROPSHIP", "WAREHOUSE"};
        String[] warehouses = {"Block A", "Block B", "Block C", "Block D", "Block F"};
        String[] modes = {"Road", "Flight", "Ship", "Road", "Road"};
        String[] carriers = {"FedEx", "UPS", "DHL", "USPS", "FedEx"};

        int orderCount = 0;
        for (int u = 0; u < individuals.size(); u++) {
            User buyer = individuals.get(u);
            // Each user makes 2-5 orders from random stores
            int numOrders = 2 + random.nextInt(4);
            for (int o = 0; o < numOrders; o++) {
                int storeIdx = random.nextInt(allStores.size());
                Store store = allStores.get(storeIdx);
                List<Product> storeProducts = allStoreProducts.get(storeIdx);

                OrderStatus status = statuses[random.nextInt(statuses.length)];
                String payment = payments[random.nextInt(payments.length)];
                String channel = channels[random.nextInt(channels.length)];
                String fulfilment = fulfilments[random.nextInt(fulfilments.length)];
                LocalDateTime date = LocalDateTime.now().minusDays(1 + random.nextInt(120));

                Order order = new Order();
                order.setUser(buyer);
                order.setStore(store);
                order.setStatus(status);
                order.setPaymentMethod(payment);
                order.setSalesChannel(channel);
                order.setFulfilment(fulfilment);
                order.setOrderDate(date);
                order.setGrandTotal(BigDecimal.ZERO);
                order = orderRepository.save(order);

                // 1-4 items per order
                int numItems = 1 + random.nextInt(4);
                BigDecimal total = BigDecimal.ZERO;
                Set<Long> usedProducts = new HashSet<>();
                for (int i = 0; i < numItems; i++) {
                    Product product = storeProducts.get(random.nextInt(storeProducts.size()));
                    if (usedProducts.contains(product.getId())) continue;
                    usedProducts.add(product.getId());

                    int qty = 1 + random.nextInt(3);
                    BigDecimal disc = random.nextInt(5) == 0 ? BigDecimal.valueOf(5 + random.nextInt(16)) : null;

                    OrderItem oi = new OrderItem();
                    oi.setOrder(order);
                    oi.setProduct(product);
                    oi.setQuantity(qty);
                    oi.setPrice(product.getUnitPrice());
                    oi.setDiscountPercent(disc);
                    orderItemRepository.save(oi);

                    BigDecimal itemTotal = product.getUnitPrice().multiply(BigDecimal.valueOf(qty));
                    if (disc != null) {
                        itemTotal = itemTotal.multiply(BigDecimal.ONE.subtract(disc.divide(BigDecimal.valueOf(100))));
                    }
                    total = total.add(itemTotal);
                }

                order.setGrandTotal(total.setScale(2, java.math.RoundingMode.HALF_UP));
                orderRepository.save(order);

                // Shipment (from DS3: warehouse, mode, carrier, tracking)
                if (status != OrderStatus.PENDING && status != CANCELLED) {
                    Shipment s = new Shipment();
                    s.setOrder(order);
                    s.setWarehouse(warehouses[random.nextInt(warehouses.length)]);
                    s.setMode(modes[random.nextInt(modes.length)]);
                    s.setCarrier(carriers[random.nextInt(carriers.length)]);
                    s.setTrackingNumber("TRK-" + (800000 + orderCount));
                    s.setDestination(cities[u % cities.length]);
                    s.setCustomerCareCalls(random.nextInt(5));

                    if (status == OrderStatus.DELIVERED) {
                        s.setStatus(ShipmentStatus.DELIVERED);
                        s.setShippedDate(date.plusDays(1));
                        s.setEstimatedArrival(date.plusDays(5));
                        s.setDeliveredDate(date.plusDays(3 + random.nextInt(4)));
                    } else if (status == OrderStatus.SHIPPED) {
                        s.setStatus(ShipmentStatus.IN_TRANSIT);
                        s.setShippedDate(date.plusDays(1));
                        s.setEstimatedArrival(date.plusDays(5));
                    } else {
                        s.setStatus(ShipmentStatus.PROCESSING);
                    }
                    shipmentRepository.save(s);
                }
                orderCount++;
            }
        }

        // ======= REVIEWS (from DS6: StarRating, HelpfulVotes, Sentiment) =======
        String[][] reviewTemplates = {
            {"5", "POSITIVE", "Absolutely fantastic product! Exceeded all my expectations."},
            {"5", "POSITIVE", "Best purchase I've made this year. Highly recommended!"},
            {"5", "POSITIVE", "Perfect quality, fast shipping. Will buy again."},
            {"4", "POSITIVE", "Great product overall, minor improvements possible."},
            {"4", "POSITIVE", "Good value for money. Very satisfied with the purchase."},
            {"4", "POSITIVE", "Works exactly as described. Happy with this buy."},
            {"3", "NEUTRAL", "Decent product for the price. Nothing extraordinary."},
            {"3", "NEUTRAL", "Average quality. Does the job but nothing special."},
            {"3", "NEUTRAL", "It's okay. Met my basic expectations."},
            {"2", "NEGATIVE", "Not what I expected. Quality could be much better."},
            {"2", "NEGATIVE", "Disappointed with the build quality. Feels cheap."},
            {"1", "NEGATIVE", "Terrible product. Broke after first use. Don't buy."},
            {"5", "POSITIVE", "Outstanding quality and great customer service!"},
            {"4", "POSITIVE", "Really nice product. Shipping was a bit slow though."},
            {"3", "NEUTRAL", "Looks different from photos. Acceptable quality."},
        };

        List<Product> allProducts = new ArrayList<>();
        allProducts.addAll(techProducts);
        allProducts.addAll(greenProducts);
        allProducts.addAll(fashionProducts);
        allProducts.addAll(homeProducts);

        for (Product product : allProducts) {
            // Each product gets 2-6 reviews from random users
            int numReviews = 2 + random.nextInt(5);
            Set<Long> reviewers = new HashSet<>();
            for (int i = 0; i < numReviews; i++) {
                User reviewer = individuals.get(random.nextInt(individuals.size()));
                if (reviewers.contains(reviewer.getId())) continue;
                reviewers.add(reviewer.getId());

                String[] tmpl = reviewTemplates[random.nextInt(reviewTemplates.length)];
                Review r = new Review();
                r.setUser(reviewer);
                r.setProduct(product);
                r.setStarRating(Integer.parseInt(tmpl[0]));
                r.setSentiment(Sentiment.valueOf(tmpl[1]));
                r.setReviewBody(tmpl[2]);
                r.setHelpfulVotes(random.nextInt(50));
                r.setTotalVotes(r.getHelpfulVotes() + random.nextInt(20));
                r.setReviewDate(LocalDateTime.now().minusDays(random.nextInt(90)));
                reviewRepository.save(r);
            }
        }

        System.out.println("=== Comprehensive demo data seeded successfully ===");
        System.out.println("Total: " + userRepository.count() + " users, " +
                storeRepository.count() + " stores, " +
                productRepository.count() + " products, " +
                orderRepository.count() + " orders, " +
                reviewRepository.count() + " reviews");
        System.out.println("---");
        System.out.println("Admin:      admin / 123");
        System.out.println("Corporate:  corporate1 / 123 (TechCorp)");
        System.out.println("Corporate:  corporate2 / 123 (GreenMarket)");
        System.out.println("Corporate:  corporate3 / 123 (FashionHub)");
        System.out.println("Corporate:  corporate4 / 123 (HomeEssentials)");
        System.out.println("Individual: user1 ... user20 / 123");
    }

    // === Helper Methods ===

    private User createUser(String fn, String ln, String email, String pwHash, RoleType role, String gender) {
        User u = new User();
        u.setFirstName(fn);
        u.setLastName(ln);
        u.setEmail(email);
        u.setPasswordHash(pwHash);
        u.setRoleType(role);
        u.setGender(gender);
        return userRepository.save(u);
    }

    private Category cat(String name, Category parent) {
        Category c = new Category();
        c.setName(name);
        c.setParent(parent);
        return categoryRepository.save(c);
    }

    private Store createStore(User owner, String name, String desc, StoreStatus status) {
        Store s = new Store();
        s.setOwner(owner);
        s.setName(name);
        s.setDescription(desc);
        s.setStatus(status);
        return storeRepository.save(s);
    }

    private Product prod(Store store, Category cat, String sku, String name, String desc, String price, int stock) {
        Product p = new Product();
        p.setStore(store);
        p.setCategory(cat);
        p.setSku(sku);
        p.setName(name);
        p.setDescription(desc);
        BigDecimal unitPrice = new BigDecimal(price);
        p.setUnitPrice(unitPrice);
        // DS3 CostOfProduct: supplier/production cost in USD.
        // Simulated as 55-70% of unit_price (deterministic via Random(42)) to match
        // the cost-to-retail distribution observed in the DS3 shipping dataset.
        double ratio = 0.55 + (random.nextDouble() * 0.15);
        BigDecimal costPrice = unitPrice.multiply(BigDecimal.valueOf(ratio))
                .setScale(2, java.math.RoundingMode.HALF_UP);
        p.setCostPrice(costPrice);
        p.setStock(stock);
        return productRepository.save(p);
    }
}

# Entity-Relationship Diagram

The diagram below is the canonical ER model used by the Spring Boot backend (JPA entities under `backend/src/main/java/com/demo/ecommerce/entity/`).

```mermaid
erDiagram
    USER ||--o| CUSTOMER_PROFILE : "has"
    USER ||--o{ STORE : "owns (CORPORATE)"
    USER ||--o{ ORDER : "places (INDIVIDUAL)"
    USER ||--o{ REVIEW : "writes"
    USER ||--o{ CART_ITEM : "fills"
    USER ||--o{ AUDIT_LOG : "actor"

    STORE ||--o{ PRODUCT : "lists"
    STORE ||--o{ ORDER : "fulfills"

    CATEGORY ||--o{ PRODUCT : "classifies"
    CATEGORY ||--o{ CATEGORY : "parent_of"

    PRODUCT ||--o{ ORDER_ITEM : "appears_in"
    PRODUCT ||--o{ REVIEW : "receives"
    PRODUCT ||--o{ CART_ITEM : "in_cart"

    ORDER ||--|{ ORDER_ITEM : "contains"
    ORDER ||--o| SHIPMENT : "has"

    USER {
        bigint id PK
        string email UK
        string password_hash
        enum role "ADMIN | CORPORATE | INDIVIDUAL"
        boolean suspended
        timestamp created_at
    }

    CUSTOMER_PROFILE {
        bigint id PK
        bigint user_id FK
        string city
        int age
        enum membership "BASIC | SILVER | GOLD | PLATINUM"
    }

    STORE {
        bigint id PK
        bigint owner_id FK
        string name
        enum status "PENDING | ACTIVE | SUSPENDED"
    }

    CATEGORY {
        bigint id PK
        bigint parent_id FK "nullable"
        string name
    }

    PRODUCT {
        bigint id PK
        bigint store_id FK
        bigint category_id FK
        string name
        decimal price
        decimal cost_price
        int stock "CHECK >= 0"
    }

    ORDER {
        bigint id PK
        bigint user_id FK
        bigint store_id FK
        decimal total
        enum status "CREATED | PAID | SHIPPED | DELIVERED | CANCELLED"
        timestamp created_at
    }

    ORDER_ITEM {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        int quantity
        decimal unit_price
    }

    SHIPMENT {
        bigint id PK
        bigint order_id FK,UK
        string carrier
        string tracking_no
        enum status "PENDING | IN_TRANSIT | DELIVERED | RETURNED"
    }

    REVIEW {
        bigint id PK
        bigint user_id FK
        bigint product_id FK
        int star_rating "CHECK 1..5"
        text comment
        enum sentiment "POSITIVE | NEUTRAL | NEGATIVE"
    }

    CART_ITEM {
        bigint id PK
        bigint user_id FK
        bigint product_id FK
        int quantity
    }

    AUDIT_LOG {
        bigint id PK
        bigint actor_user_id FK
        string action
        string entity_type
        timestamp at
    }

    SYSTEM_SETTING {
        string key PK
        string value
    }
```

## Normalization Notes

- All entities are in **3NF**: no transitive dependencies; non-key attributes depend on the whole primary key.
- `OrderItem` is a proper junction with its own PK plus quantity/unit_price (avoids storing computed total on `Order` denormalized).
- `Category` is recursive (self-referencing `parent_id`) for category hierarchy.
- Lookup enums (`OrderStatus`, `ShipmentStatus`, `MembershipType`, `Sentiment`, `StoreStatus`, `RoleType`) are stored as `VARCHAR` via `@Enumerated(EnumType.STRING)` for readability and migration safety.

## Indexes (selected)

| Table | Index | Purpose |
|---|---|---|
| `product` | `idx_product_store(store_id)` | dashboard product-by-store queries |
| `product` | `idx_product_category(category_id)` | category drill-down |
| `order` | `idx_order_user(user_id)` | individual dashboard |
| `order` | `idx_order_store(store_id)` | corporate dashboard |
| `order` | `idx_order_status(status)` | admin pipeline view |
| `review` | `idx_review_product(product_id)` | product page aggregation |

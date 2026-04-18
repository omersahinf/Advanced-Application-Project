# ETL Field Mapping Documentation

## Overview

This document describes how six Kaggle e-commerce datasets were integrated into the platform's unified relational schema. The ETL (Extract, Transform, Load) process involved field mapping, data cleansing, surrogate key generation, date normalization (ISO 8601), and currency standardization (USD).

## Source Datasets

| # | Dataset | Kaggle Source | Primary Usage |
|---|---------|---------------|---------------|
| DS1 | E-Commerce Sales Forecast (UCI Online Retail) | UCI Machine Learning Repository | Orders, OrderItems, Products |
| DS2 | E-Commerce Customer Behavior | kaggle.com/datasets/uom190346a/e-commerce-customer-behavior | Users, CustomerProfiles |
| DS3 | E-Commerce Shipping Data | kaggle.com/datasets/prachi13/customer-analytics | Shipments |
| DS4 | E-Commerce Sales (Amazon) | kaggle.com/datasets/thedevastator/unlock-profits-with-e-commerce-sales-data | Orders (status, fulfilment) |
| DS5 | Pakistan E-Commerce Orders | kaggle.com/datasets/zusmani/pakistans-largest-ecommerce-dataset | Orders, OrderItems, PaymentMethods |
| DS6 | Amazon US Customer Reviews | kaggle.com/datasets/cynthiarempel/amazon-us-customer-reviews-dataset | Reviews, Sentiment Analysis |

## Field Mapping Matrix

### Users Table
| Target Field | DS1 Source | DS2 Source | DS3 Source | DS6 Source | Transform |
|-------------|-----------|-----------|-----------|-----------|-----------|
| id | - | CustomerID | - | CustomerID | Surrogate key (auto-increment) |
| first_name | - | (generated) | - | - | Split from full name or generated |
| last_name | - | (generated) | - | - | Split from full name or generated |
| email | - | (generated) | - | - | Generated from name pattern |
| password_hash | - | - | - | - | BCrypt encoded default |
| role_type | - | - | - | - | Assigned: ADMIN/CORPORATE/INDIVIDUAL |
| gender | - | Gender | Gender | - | Standardized to Male/Female |
| created_at | - | - | - | - | ISO 8601 timestamp |

### Products Table
| Target Field | DS1 Source | DS3 Source | DS4 Source | DS5 Source | DS6 Source | Transform |
|-------------|-----------|-----------|-----------|-----------|-----------|-----------|
| id | - | - | - | - | - | Surrogate key (auto-increment) |
| store_id | - | - | - | - | - | FK to stores table |
| category_id | - | - | Category | CategoryName | ProductCategory | Mapped to categories hierarchy |
| sku | StockCode | - | SKU | SKU | - | Cleaned, deduplicated |
| name | Description | - | Style | - | ProductTitle | Truncated to 255 chars, trimmed |
| description | - | - | - | - | - | Generated from product attributes |
| unit_price | UnitPrice | - | - | Price | - | Converted to USD, ROUND(2) |
| cost_price | - | CostOfProduct | - | - | - | Supplier/production cost in USD, ROUND(2). Enables gross-margin analytics. |
| stock | Quantity (aggregated) | - | - | QtyOrdered (inverse) | - | Calculated from inventory |
| created_at | InvoiceDate (earliest) | - | Date | CreatedAt | - | ISO 8601 normalized |

### Orders Table
| Target Field | DS1 Source | DS4 Source | DS5 Source | Transform |
|-------------|-----------|-----------|-----------|-----------|
| id | InvoiceNo | OrderID | IncrementID | Surrogate key |
| user_id | CustomerID | - | - | FK mapped via customer lookup |
| store_id | - | - | - | Assigned based on product->store |
| status | - | Status | Status | Enum: PENDING/CONFIRMED/SHIPPED/DELIVERED/CANCELLED |
| grand_total | SUM(Quantity*UnitPrice) | - | GrandTotal | Recalculated, USD normalized |
| payment_method | - | - | PaymentMethod | Enum: CREDIT_CARD/DEBIT_CARD/PAYPAL/BANK_TRANSFER |
| sales_channel | - | SalesChannel | - | Enum: WEB/MOBILE/IN_STORE |
| fulfilment | - | Fulfilment | - | Enum: WAREHOUSE/STORE/DROPSHIP |
| order_date | InvoiceDate | Date | CreatedAt | ISO 8601 normalized |

### OrderItems Table
| Target Field | DS1 Source | DS5 Source | Transform |
|-------------|-----------|-----------|-----------|
| id | - | ItemID | Surrogate key |
| order_id | InvoiceNo | IncrementID | FK to orders |
| product_id | StockCode | SKU | FK mapped via product lookup |
| quantity | Quantity | QtyOrdered | Abs value (negatives = returns) |
| price | UnitPrice | Price | USD normalized |
| discount_percent | - | DiscountOffered | Percentage 0-100 |

### Shipments Table
| Target Field | DS3 Source | DS4 Source | Transform |
|-------------|-----------|-----------|-----------|
| id | ID | - | Surrogate key |
| order_id | - | OrderID | FK to orders |
| warehouse | WarehouseBlock | - | Mapped to Block A-F |
| mode | ModeOfShipment | ShipServiceLevel | Enum: Ship/Flight/Road |
| status | - | - | Derived: PROCESSING/IN_TRANSIT/DELIVERED |
| tracking_number | - | - | Generated: TRK-{id} |
| carrier | - | - | Assigned: FedEx/UPS/DHL/USPS |
| destination | - | - | From customer profile city |
| customer_care_calls | CustomerCareCalls | - | Direct mapping |
| shipped_date | - | Date | order_date + 1 day |
| estimated_arrival | - | - | order_date + 5 days |
| delivered_date | - | - | order_date + 3-6 days (if delivered) |

### Reviews Table
| Target Field | DS6 Source | DS2 Source | DS3 Source | Transform |
|-------------|-----------|-----------|-----------|-----------|
| id | ReviewID | - | - | Surrogate key |
| user_id | CustomerID | - | - | FK mapped via customer lookup |
| product_id | ProductID | - | - | FK mapped via product lookup |
| star_rating | StarRating | - | CustomerRating | Integer 1-5 |
| review_body | ReviewBody | - | - | Truncated to 1000 chars |
| sentiment | - | SatisfactionLevel | - | Derived: POSITIVE (4-5), NEUTRAL (3), NEGATIVE (1-2) |
| helpful_votes | HelpfulVotes | - | - | Direct mapping |
| total_votes | TotalVotes | - | - | Direct mapping |
| review_date | ReviewDate | - | - | ISO 8601 normalized |

### Categories Table
| Target Field | Source | Transform |
|-------------|--------|-----------|
| id | - | Surrogate key |
| name | DS4.Category, DS5.CategoryName, DS6.ProductCategory | Deduplicated, hierarchical |
| parent_id | - | Manual hierarchy: Electronics->Computers, Fashion->Men's, etc. |

### CustomerProfiles Table
| Target Field | DS2 Source | DS3 Source | Transform |
|-------------|-----------|-----------|-----------|
| id | - | - | Surrogate key |
| user_id | CustomerID | - | FK to users |
| age | Age | - | Direct mapping, validated 18-99 |
| city | City | - | Standardized city names |
| membership_type | MembershipType | - | Enum: GOLD/SILVER/BRONZE |
| total_spend | TotalSpend | CostOfProduct (sum) | USD normalized, ROUND(2) |
| items_purchased | ItemsPurchased | - | Direct mapping |
| avg_rating | AvgRating | CustomerRating | ROUND(2) |
| discount_applied | DiscountApplied | DiscountOffered>0 | Boolean |
| satisfaction_level | SatisfactionLevel | - | Enum: Satisfied/Neutral/Unsatisfied |
| prior_purchases | - | PriorPurchases | Direct mapping |

## Data Cleansing Rules

1. **Null handling**: Missing numeric fields default to 0; missing strings default to empty
2. **Duplicate removal**: Deduplicated by composite key (e.g., CustomerID + InvoiceNo for orders)
3. **Outlier filtering**: Negative quantities treated as returns (excluded from stock calc)
4. **String normalization**: Trimmed whitespace, title case for names, uppercase for enums

## Date Normalization

All dates converted to ISO 8601 format (`yyyy-MM-dd'T'HH:mm:ss`):
- DS1 `InvoiceDate` (dd/MM/yyyy HH:mm) -> ISO 8601
- DS4 `Date` (MM-dd-yy) -> ISO 8601
- DS5 `CreatedAt` (yyyy-MM-dd HH:mm:ss) -> already ISO 8601
- DS6 `ReviewDate` (yyyy-MM-dd) -> ISO 8601 with 00:00:00

## Currency Normalization

All monetary values normalized to USD:
- DS1: GBP -> USD (exchange rate: 1 GBP = 1.27 USD, snapshot date: 2024-01-01)
- DS5: PKR -> USD (exchange rate: 1 PKR = 0.0036 USD, snapshot date: 2024-01-01)
- DS4, DS6: Already in USD
- Exchange rate metadata stored in DataSeeder comments

## Implementation

The ETL process is implemented in:
- **Backend**: `DataSeeder.java` — Programmatic seed that simulates the ETL pipeline at startup
- **Chatbot**: `seed_data.py` — Mirror seed for the analytics database

Both seeders use `Random(42)` for deterministic, reproducible data generation that follows the field mappings above.

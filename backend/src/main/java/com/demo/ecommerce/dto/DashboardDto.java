package com.demo.ecommerce.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class DashboardDto {

    // Admin platform-wide KPIs
    public static class AdminDashboard {
        private long totalUsers;
        private long totalStores;
        private long totalProducts;
        private long totalOrders;
        private BigDecimal totalRevenue;
        private Map<String, Long> ordersByStatus;
        private Map<String, Long> usersByRole;
        private List<StoreRevenue> topStores;

        public long getTotalUsers() { return totalUsers; }
        public void setTotalUsers(long v) { totalUsers = v; }
        public long getTotalStores() { return totalStores; }
        public void setTotalStores(long v) { totalStores = v; }
        public long getTotalProducts() { return totalProducts; }
        public void setTotalProducts(long v) { totalProducts = v; }
        public long getTotalOrders() { return totalOrders; }
        public void setTotalOrders(long v) { totalOrders = v; }
        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal v) { totalRevenue = v; }
        public Map<String, Long> getOrdersByStatus() { return ordersByStatus; }
        public void setOrdersByStatus(Map<String, Long> v) { ordersByStatus = v; }
        public Map<String, Long> getUsersByRole() { return usersByRole; }
        public void setUsersByRole(Map<String, Long> v) { usersByRole = v; }
        public List<StoreRevenue> getTopStores() { return topStores; }
        public void setTopStores(List<StoreRevenue> v) { topStores = v; }
    }

    // Corporate store KPIs
    public static class CorporateDashboard {
        private String storeName;
        private long totalProducts;
        private long lowStockProducts;
        private long totalOrders;
        private long pendingOrders;
        private BigDecimal totalRevenue;
        private double avgRating;
        private long totalReviews;
        private Map<String, Long> ordersByStatus;
        private List<TopProduct> topProducts;
        private Map<String, BigDecimal> revenueByMonth;

        public String getStoreName() { return storeName; }
        public void setStoreName(String v) { storeName = v; }
        public long getTotalProducts() { return totalProducts; }
        public void setTotalProducts(long v) { totalProducts = v; }
        public long getLowStockProducts() { return lowStockProducts; }
        public void setLowStockProducts(long v) { lowStockProducts = v; }
        public long getTotalOrders() { return totalOrders; }
        public void setTotalOrders(long v) { totalOrders = v; }
        public long getPendingOrders() { return pendingOrders; }
        public void setPendingOrders(long v) { pendingOrders = v; }
        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal v) { totalRevenue = v; }
        public double getAvgRating() { return avgRating; }
        public void setAvgRating(double v) { avgRating = v; }
        public long getTotalReviews() { return totalReviews; }
        public void setTotalReviews(long v) { totalReviews = v; }
        public Map<String, Long> getOrdersByStatus() { return ordersByStatus; }
        public void setOrdersByStatus(Map<String, Long> v) { ordersByStatus = v; }
        public List<TopProduct> getTopProducts() { return topProducts; }
        public void setTopProducts(List<TopProduct> v) { topProducts = v; }
        public Map<String, BigDecimal> getRevenueByMonth() { return revenueByMonth; }
        public void setRevenueByMonth(Map<String, BigDecimal> v) { revenueByMonth = v; }
    }

    // Individual spending analytics
    public static class IndividualDashboard {
        private BigDecimal totalSpend;
        private long totalOrders;
        private int totalItemsPurchased;
        private double avgOrderValue;
        private int totalReviews;
        private String membershipType;
        private Map<String, Long> ordersByStatus;
        private Map<String, BigDecimal> spendByCategory;

        public BigDecimal getTotalSpend() { return totalSpend; }
        public void setTotalSpend(BigDecimal v) { totalSpend = v; }
        public long getTotalOrders() { return totalOrders; }
        public void setTotalOrders(long v) { totalOrders = v; }
        public int getTotalItemsPurchased() { return totalItemsPurchased; }
        public void setTotalItemsPurchased(int v) { totalItemsPurchased = v; }
        public double getAvgOrderValue() { return avgOrderValue; }
        public void setAvgOrderValue(double v) { avgOrderValue = v; }
        public int getTotalReviews() { return totalReviews; }
        public void setTotalReviews(int v) { totalReviews = v; }
        public String getMembershipType() { return membershipType; }
        public void setMembershipType(String v) { membershipType = v; }
        public Map<String, Long> getOrdersByStatus() { return ordersByStatus; }
        public void setOrdersByStatus(Map<String, Long> v) { ordersByStatus = v; }
        public Map<String, BigDecimal> getSpendByCategory() { return spendByCategory; }
        public void setSpendByCategory(Map<String, BigDecimal> v) { spendByCategory = v; }
    }

    public static class StoreRevenue {
        private String storeName;
        private BigDecimal revenue;

        public StoreRevenue(String storeName, BigDecimal revenue) {
            this.storeName = storeName;
            this.revenue = revenue;
        }
        public String getStoreName() { return storeName; }
        public BigDecimal getRevenue() { return revenue; }
    }

    public static class TopProduct {
        private String productName;
        private long orderCount;
        private BigDecimal revenue;

        public TopProduct(String productName, long orderCount, BigDecimal revenue) {
            this.productName = productName;
            this.orderCount = orderCount;
            this.revenue = revenue;
        }
        public String getProductName() { return productName; }
        public long getOrderCount() { return orderCount; }
        public BigDecimal getRevenue() { return revenue; }
    }

    // Cross-store comparison
    public static class StoreComparison {
        private Long storeId;
        private String storeName;
        private String ownerName;
        private String status;
        private long totalProducts;
        private long totalOrders;
        private BigDecimal totalRevenue;
        private double avgRating;
        private long totalReviews;

        public Long getStoreId() { return storeId; }
        public void setStoreId(Long v) { storeId = v; }
        public String getStoreName() { return storeName; }
        public void setStoreName(String v) { storeName = v; }
        public String getOwnerName() { return ownerName; }
        public void setOwnerName(String v) { ownerName = v; }
        public String getStatus() { return status; }
        public void setStatus(String v) { status = v; }
        public long getTotalProducts() { return totalProducts; }
        public void setTotalProducts(long v) { totalProducts = v; }
        public long getTotalOrders() { return totalOrders; }
        public void setTotalOrders(long v) { totalOrders = v; }
        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal v) { totalRevenue = v; }
        public double getAvgRating() { return avgRating; }
        public void setAvgRating(double v) { avgRating = v; }
        public long getTotalReviews() { return totalReviews; }
        public void setTotalReviews(long v) { totalReviews = v; }
    }

    // Customer segmentation
    public static class CustomerSegmentation {
        private Map<String, Long> byMembership;
        private Map<String, Long> byCity;
        private Map<String, BigDecimal> spendByMembership;
        private long totalCustomers;
        private BigDecimal avgSpend;

        public Map<String, Long> getByMembership() { return byMembership; }
        public void setByMembership(Map<String, Long> v) { byMembership = v; }
        public Map<String, Long> getByCity() { return byCity; }
        public void setByCity(Map<String, Long> v) { byCity = v; }
        public Map<String, BigDecimal> getSpendByMembership() { return spendByMembership; }
        public void setSpendByMembership(Map<String, BigDecimal> v) { spendByMembership = v; }
        public long getTotalCustomers() { return totalCustomers; }
        public void setTotalCustomers(long v) { totalCustomers = v; }
        public BigDecimal getAvgSpend() { return avgSpend; }
        public void setAvgSpend(BigDecimal v) { avgSpend = v; }
    }
}

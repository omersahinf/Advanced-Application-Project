package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.DashboardDto;
import com.demo.ecommerce.entity.*;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.repository.*;
import static com.demo.ecommerce.entity.OrderStatus.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final ReviewRepository reviewRepository;
    private final CustomerProfileRepository customerProfileRepository;

    public DashboardService(UserRepository userRepository, StoreRepository storeRepository,
                            ProductRepository productRepository, OrderRepository orderRepository,
                            ReviewRepository reviewRepository,
                            CustomerProfileRepository customerProfileRepository) {
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.reviewRepository = reviewRepository;
        this.customerProfileRepository = customerProfileRepository;
    }

    public DashboardDto.AdminDashboard getAdminDashboard() {
        DashboardDto.AdminDashboard dash = new DashboardDto.AdminDashboard();

        List<User> allUsers = userRepository.findAll();
        List<Order> allOrders = orderRepository.findAll();

        dash.setTotalUsers(allUsers.size());
        dash.setTotalStores(storeRepository.count());
        dash.setTotalProducts(productRepository.count());
        dash.setTotalOrders(allOrders.size());

        BigDecimal totalRevenue = allOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(Order::getGrandTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dash.setTotalRevenue(totalRevenue);

        Map<String, Long> ordersByStatus = allOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getStatus().name(), Collectors.counting()));
        dash.setOrdersByStatus(ordersByStatus);

        Map<String, Long> usersByRole = allUsers.stream()
                .collect(Collectors.groupingBy(u -> u.getRoleType().name(), Collectors.counting()));
        dash.setUsersByRole(usersByRole);

        Map<String, BigDecimal> revenueByStore = allOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .collect(Collectors.groupingBy(
                        o -> o.getStore().getName(),
                        Collectors.reducing(BigDecimal.ZERO, Order::getGrandTotal, BigDecimal::add)
                ));
        List<DashboardDto.StoreRevenue> topStores = revenueByStore.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(10)
                .map(e -> new DashboardDto.StoreRevenue(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
        dash.setTopStores(topStores);

        return dash;
    }

    public DashboardDto.CorporateDashboard getCorporateDashboard(Long userId, LocalDate startDate, LocalDate endDate) {
        DashboardDto.CorporateDashboard dash = new DashboardDto.CorporateDashboard();

        List<Store> stores = storeRepository.findByOwnerId(userId);
        if (stores.isEmpty()) {
            throw new ResourceNotFoundException("No store found for this user");
        }
        Store store = stores.get(0);
        dash.setStoreName(store.getName());

        List<Product> products = productRepository.findByStoreId(store.getId());
        dash.setTotalProducts(products.size());
        dash.setLowStockProducts(products.stream().filter(p -> p.getStock() < 10).count());

        List<Order> orders = orderRepository.findByStoreId(store.getId());
        // Apply date filter if provided
        if (startDate != null) {
            LocalDateTime start = startDate.atStartOfDay();
            orders = orders.stream().filter(o -> !o.getOrderDate().isBefore(start)).collect(Collectors.toList());
        }
        if (endDate != null) {
            LocalDateTime end = endDate.plusDays(1).atStartOfDay();
            orders = orders.stream().filter(o -> o.getOrderDate().isBefore(end)).collect(Collectors.toList());
        }
        dash.setTotalOrders(orders.size());
        dash.setPendingOrders(orders.stream().filter(o -> o.getStatus() == OrderStatus.PENDING).count());

        BigDecimal totalRevenue = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(Order::getGrandTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dash.setTotalRevenue(totalRevenue);

        List<Review> reviews = reviewRepository.findByProductStoreId(store.getId());
        dash.setTotalReviews(reviews.size());
        dash.setAvgRating(reviews.stream()
                .mapToInt(Review::getStarRating)
                .average().orElse(0.0));

        Map<String, Long> ordersByStatus = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getStatus().name(), Collectors.counting()));
        dash.setOrdersByStatus(ordersByStatus);

        Map<String, BigDecimal> revenueByProduct = new HashMap<>();
        Map<String, Long> orderCountByProduct = new HashMap<>();
        for (Order order : orders) {
            if (order.getStatus() == OrderStatus.CANCELLED) continue;
            for (OrderItem item : order.getOrderItems()) {
                String pName = item.getProduct().getName();
                BigDecimal itemRevenue = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                revenueByProduct.merge(pName, itemRevenue, BigDecimal::add);
                orderCountByProduct.merge(pName, 1L, Long::sum);
            }
        }
        List<DashboardDto.TopProduct> topProducts = revenueByProduct.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(5)
                .map(e -> new DashboardDto.TopProduct(
                        e.getKey(),
                        orderCountByProduct.getOrDefault(e.getKey(), 0L),
                        e.getValue()))
                .collect(Collectors.toList());
        dash.setTopProducts(topProducts);

        // Monthly revenue trend
        java.util.TreeMap<String, BigDecimal> revenueByMonth = new java.util.TreeMap<>();
        for (Order order : orders) {
            if (order.getStatus() == OrderStatus.CANCELLED) continue;
            String monthKey = order.getOrderDate().toLocalDate().withDayOfMonth(1).toString().substring(0, 7); // yyyy-MM
            revenueByMonth.merge(monthKey, order.getGrandTotal(), BigDecimal::add);
        }
        dash.setRevenueByMonth(revenueByMonth);

        return dash;
    }

    public List<DashboardDto.StoreComparison> getStoreComparison() {
        List<Store> stores = storeRepository.findAll();
        List<DashboardDto.StoreComparison> result = new ArrayList<>();

        for (Store store : stores) {
            DashboardDto.StoreComparison sc = new DashboardDto.StoreComparison();
            sc.setStoreId(store.getId());
            sc.setStoreName(store.getName());
            sc.setOwnerName(store.getOwner().getFirstName() + " " + store.getOwner().getLastName());
            sc.setStatus(store.getStatus().name());
            sc.setTotalProducts(productRepository.findByStoreId(store.getId()).size());

            List<Order> orders = orderRepository.findByStoreId(store.getId());
            sc.setTotalOrders(orders.size());
            BigDecimal revenue = orders.stream()
                    .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                    .map(Order::getGrandTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            sc.setTotalRevenue(revenue);

            List<Review> reviews = reviewRepository.findByProductStoreId(store.getId());
            sc.setTotalReviews(reviews.size());
            sc.setAvgRating(reviews.stream().mapToInt(Review::getStarRating).average().orElse(0.0));

            result.add(sc);
        }

        result.sort((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()));
        return result;
    }

    public DashboardDto.CustomerSegmentation getCustomerSegmentation() {
        DashboardDto.CustomerSegmentation seg = new DashboardDto.CustomerSegmentation();

        List<CustomerProfile> profiles = customerProfileRepository.findAll();
        seg.setTotalCustomers(profiles.size());

        Map<String, Long> byMembership = profiles.stream()
                .filter(p -> p.getMembershipType() != null)
                .collect(Collectors.groupingBy(p -> p.getMembershipType().name(), Collectors.counting()));
        seg.setByMembership(byMembership);

        Map<String, Long> byCity = profiles.stream()
                .filter(p -> p.getCity() != null)
                .collect(Collectors.groupingBy(CustomerProfile::getCity, Collectors.counting()));
        seg.setByCity(byCity);

        Map<String, BigDecimal> spendByMembership = profiles.stream()
                .filter(p -> p.getMembershipType() != null && p.getTotalSpend() != null)
                .collect(Collectors.groupingBy(
                        p -> p.getMembershipType().name(),
                        Collectors.reducing(BigDecimal.ZERO, CustomerProfile::getTotalSpend, BigDecimal::add)
                ));
        seg.setSpendByMembership(spendByMembership);

        BigDecimal totalSpend = profiles.stream()
                .map(p -> p.getTotalSpend() != null ? p.getTotalSpend() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        seg.setAvgSpend(profiles.isEmpty() ? BigDecimal.ZERO
                : totalSpend.divide(BigDecimal.valueOf(profiles.size()), 2, RoundingMode.HALF_UP));

        return seg;
    }

    public DashboardDto.CustomerSegmentation getCorporateCustomerSegmentation(Long ownerId) {
        List<Store> stores = storeRepository.findByOwnerId(ownerId);
        if (stores.isEmpty()) {
            DashboardDto.CustomerSegmentation empty = new DashboardDto.CustomerSegmentation();
            empty.setTotalCustomers(0);
            empty.setByMembership(Map.of());
            empty.setByCity(Map.of());
            empty.setSpendByMembership(Map.of());
            empty.setAvgSpend(BigDecimal.ZERO);
            return empty;
        }

        // Get unique customer IDs who ordered from this store
        Set<Long> customerIds = new HashSet<>();
        for (Store store : stores) {
            orderRepository.findByStoreId(store.getId()).forEach(o -> customerIds.add(o.getUser().getId()));
        }

        List<CustomerProfile> profiles = customerProfileRepository.findAll().stream()
                .filter(cp -> customerIds.contains(cp.getOwner().getId()))
                .collect(Collectors.toList());

        DashboardDto.CustomerSegmentation seg = new DashboardDto.CustomerSegmentation();
        seg.setTotalCustomers(profiles.size());

        seg.setByMembership(profiles.stream()
                .filter(p -> p.getMembershipType() != null)
                .collect(Collectors.groupingBy(p -> p.getMembershipType().name(), Collectors.counting())));

        seg.setByCity(profiles.stream()
                .filter(p -> p.getCity() != null)
                .collect(Collectors.groupingBy(CustomerProfile::getCity, Collectors.counting())));

        seg.setSpendByMembership(profiles.stream()
                .filter(p -> p.getMembershipType() != null && p.getTotalSpend() != null)
                .collect(Collectors.groupingBy(
                        p -> p.getMembershipType().name(),
                        Collectors.reducing(BigDecimal.ZERO, CustomerProfile::getTotalSpend, BigDecimal::add)
                )));

        BigDecimal totalSpend = profiles.stream()
                .map(p -> p.getTotalSpend() != null ? p.getTotalSpend() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        seg.setAvgSpend(profiles.isEmpty() ? BigDecimal.ZERO
                : totalSpend.divide(BigDecimal.valueOf(profiles.size()), 2, RoundingMode.HALF_UP));

        return seg;
    }

    public DashboardDto.IndividualDashboard getIndividualDashboard(Long userId) {
        DashboardDto.IndividualDashboard dash = new DashboardDto.IndividualDashboard();

        List<Order> orders = orderRepository.findByUserId(userId);
        dash.setTotalOrders(orders.size());

        BigDecimal totalSpend = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(Order::getGrandTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        dash.setTotalSpend(totalSpend);

        int totalItems = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .flatMap(o -> o.getOrderItems().stream())
                .mapToInt(OrderItem::getQuantity)
                .sum();
        dash.setTotalItemsPurchased(totalItems);

        long nonCancelled = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .count();
        dash.setAvgOrderValue(nonCancelled > 0
                ? totalSpend.divide(BigDecimal.valueOf(nonCancelled), 2, RoundingMode.HALF_UP).doubleValue()
                : 0.0);

        List<Review> reviews = reviewRepository.findByUserId(userId);
        dash.setTotalReviews(reviews.size());

        customerProfileRepository.findByOwnerId(userId)
                .ifPresent(cp -> dash.setMembershipType(cp.getMembershipType() != null ? cp.getMembershipType().name() : null));

        Map<String, Long> ordersByStatus = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getStatus().name(), Collectors.counting()));
        dash.setOrdersByStatus(ordersByStatus);

        Map<String, BigDecimal> spendByCategory = new HashMap<>();
        for (Order order : orders) {
            if (order.getStatus() == OrderStatus.CANCELLED) continue;
            for (OrderItem item : order.getOrderItems()) {
                String catName = item.getProduct().getCategory() != null
                        ? item.getProduct().getCategory().getName() : "Uncategorized";
                BigDecimal itemTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                spendByCategory.merge(catName, itemTotal, BigDecimal::add);
            }
        }
        dash.setSpendByCategory(spendByCategory);

        return dash;
    }
}

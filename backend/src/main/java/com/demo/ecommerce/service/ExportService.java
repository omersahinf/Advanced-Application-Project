package com.demo.ecommerce.service;

import com.demo.ecommerce.entity.*;
import com.demo.ecommerce.exception.ExportException;
import com.demo.ecommerce.repository.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

@Service
public class ExportService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public ExportService(OrderRepository orderRepository, ProductRepository productRepository,
                         UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    public void exportOrdersCsv(HttpServletResponse response) {
        setCsvHeaders(response, "orders_export.csv");
        try (PrintWriter writer = response.getWriter()) {
            writer.println("OrderID,Customer,CustomerEmail,Store,Status,GrandTotal,PaymentMethod,SalesChannel,OrderDate");
            List<Order> orders = orderRepository.findAll();
            for (Order o : orders) {
                writer.printf("%d,\"%s %s\",%s,\"%s\",%s,%.2f,%s,%s,%s%n",
                        o.getId(),
                        o.getUser().getFirstName(), o.getUser().getLastName(),
                        o.getUser().getEmail(),
                        o.getStore().getName(),
                        o.getStatus(),
                        o.getGrandTotal(),
                        o.getPaymentMethod(),
                        o.getSalesChannel(),
                        o.getOrderDate());
            }
        } catch (IOException e) {
            throw new ExportException("Failed to export orders", e);
        }
    }

    public void exportProductsCsv(HttpServletResponse response) {
        setCsvHeaders(response, "products_export.csv");
        try (PrintWriter writer = response.getWriter()) {
            writer.println("ProductID,SKU,Name,Category,Store,UnitPrice,Stock,CreatedAt");
            List<Product> products = productRepository.findAll();
            for (Product p : products) {
                writer.printf("%d,%s,\"%s\",\"%s\",\"%s\",%.2f,%d,%s%n",
                        p.getId(),
                        p.getSku(),
                        p.getName(),
                        p.getCategory() != null ? p.getCategory().getName() : "N/A",
                        p.getStore().getName(),
                        p.getUnitPrice(),
                        p.getStock(),
                        p.getCreatedAt());
            }
        } catch (IOException e) {
            throw new ExportException("Failed to export products", e);
        }
    }

    public void exportUsersCsv(HttpServletResponse response) {
        setCsvHeaders(response, "users_export.csv");
        try (PrintWriter writer = response.getWriter()) {
            writer.println("UserID,FirstName,LastName,Email,Role,Gender,CreatedAt");
            List<User> users = userRepository.findAll();
            for (User u : users) {
                writer.printf("%d,%s,%s,%s,%s,%s,%s%n",
                        u.getId(),
                        u.getFirstName(),
                        u.getLastName(),
                        u.getEmail(),
                        u.getRoleType(),
                        u.getGender(),
                        u.getCreatedAt());
            }
        } catch (IOException e) {
            throw new ExportException("Failed to export users", e);
        }
    }

    private void setCsvHeaders(HttpServletResponse response, String filename) {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
    }
}

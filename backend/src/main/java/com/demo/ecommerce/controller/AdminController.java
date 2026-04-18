package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.*;
import com.demo.ecommerce.entity.StoreStatus;
import com.demo.ecommerce.exception.BadRequestException;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ADMIN')")
@Tag(name = "Admin", description = "Platform administration endpoints")
public class AdminController {

    private final UserManagementService userManagementService;
    private final StoreService storeService;
    private final CategoryService categoryService;
    private final DashboardService dashboardService;
    private final AuditLogService auditLogService;
    private final ExportService exportService;
    private final SystemSettingsService systemSettingsService;

    public AdminController(UserManagementService userManagementService, StoreService storeService,
                           CategoryService categoryService, DashboardService dashboardService,
                           AuditLogService auditLogService, ExportService exportService,
                           SystemSettingsService systemSettingsService) {
        this.userManagementService = userManagementService;
        this.storeService = storeService;
        this.categoryService = categoryService;
        this.dashboardService = dashboardService;
        this.auditLogService = auditLogService;
        this.exportService = exportService;
        this.systemSettingsService = systemSettingsService;
    }

    // --- User Management ---

    @GetMapping("/users")
    @Operation(summary = "List all users (supports pagination with ?page=0&size=20)")
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) Integer page,
                                         @RequestParam(required = false, defaultValue = "20") Integer size) {
        if (page != null) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
            return ResponseEntity.ok(userManagementService.getAllUsers(pageable));
        }
        return ResponseEntity.ok(userManagementService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userManagementService.getUserById(id));
    }

    @GetMapping("/users/role/{role}")
    @Operation(summary = "Filter users by role")
    public ResponseEntity<List<UserDto>> getUsersByRole(@PathVariable String role) {
        return ResponseEntity.ok(userManagementService.getUsersByRole(role));
    }

    @PostMapping("/users")
    @Operation(summary = "Create a managed user account")
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody AdminCreateUserRequest request, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        UserDto created = userManagementService.createManagedUser(request);
        auditLogService.log(p.getUserId(), p.getEmail(), "CREATE", "USER", created.getId(),
                "Created " + created.getRole().toLowerCase() + " user: " + created.getEmail());
        return ResponseEntity.ok(created);
    }

    @PostMapping("/users/corporate")
    @Operation(summary = "Create a corporate user")
    public ResponseEntity<UserDto> createCorporateUser(@Valid @RequestBody RegisterRequest request, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        UserDto created = userManagementService.createCorporateUser(request);
        auditLogService.log(p.getUserId(), p.getEmail(), "CREATE", "USER", created.getId(), "Created corporate user: " + created.getEmail());
        return ResponseEntity.ok(created);
    }

    @PatchMapping("/users/{id}/suspend")
    @Operation(summary = "Suspend or reactivate a user")
    public ResponseEntity<Map<String, String>> suspendUser(@PathVariable Long id, @RequestBody Map<String, Boolean> body, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        boolean suspended = body.getOrDefault("suspended", true);
        userManagementService.setSuspended(id, suspended);
        String action = suspended ? "SUSPEND" : "REACTIVATE";
        auditLogService.log(p.getUserId(), p.getEmail(), action, "USER", id, action + " user #" + id);
        return ResponseEntity.ok(Map.of("message", "User " + (suspended ? "suspended" : "reactivated")));
    }

    @DeleteMapping("/users/{id}")
    @Operation(summary = "Delete a user")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long id, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        userManagementService.deleteUser(id);
        auditLogService.log(p.getUserId(), p.getEmail(), "DELETE", "USER", id, "Deleted user #" + id);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    // --- Store Management ---

    @GetMapping("/stores")
    @Operation(summary = "List all stores")
    public ResponseEntity<List<StoreDto>> getAllStores() {
        return ResponseEntity.ok(storeService.getAllStores());
    }

    @GetMapping("/stores/status/{status}")
    @Operation(summary = "Filter stores by status")
    public ResponseEntity<List<StoreDto>> getStoresByStatus(@PathVariable String status) {
        return ResponseEntity.ok(storeService.getStoresByStatus(StoreStatus.valueOf(status)));
    }

    @PatchMapping("/stores/{id}/status")
    @Operation(summary = "Update store status (ACTIVE/CLOSED/PENDING_APPROVAL)")
    public ResponseEntity<StoreDto> updateStoreStatus(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        String status = body.get("status");
        if (status == null) throw new BadRequestException("Status is required");
        StoreDto result = storeService.updateStoreStatus(id, StoreStatus.valueOf(status));
        auditLogService.log(p.getUserId(), p.getEmail(), "UPDATE_STATUS", "STORE", id, "Store #" + id + " status -> " + status);
        return ResponseEntity.ok(result);
    }

    // --- Category Management ---

    @PostMapping("/categories")
    @Operation(summary = "Create a category")
    public ResponseEntity<CategoryDto> createCategory(@Valid @RequestBody CreateCategoryRequest request, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        CategoryDto created = categoryService.create(request);
        auditLogService.log(p.getUserId(), p.getEmail(), "CREATE", "CATEGORY", created.getId(), "Created category: " + created.getName());
        return ResponseEntity.ok(created);
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Update a category")
    public ResponseEntity<CategoryDto> updateCategory(@PathVariable Long id, @Valid @RequestBody CreateCategoryRequest request, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        CategoryDto updated = categoryService.update(id, request);
        auditLogService.log(p.getUserId(), p.getEmail(), "UPDATE", "CATEGORY", id, "Updated category: " + updated.getName());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Delete a category")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable Long id, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        categoryService.delete(id);
        auditLogService.log(p.getUserId(), p.getEmail(), "DELETE", "CATEGORY", id, "Deleted category #" + id);
        return ResponseEntity.ok(Map.of("message", "Category deleted"));
    }

    // --- Platform Dashboard ---

    @GetMapping("/dashboard")
    @Operation(summary = "Get admin platform dashboard")
    public ResponseEntity<DashboardDto.AdminDashboard> getDashboard() {
        return ResponseEntity.ok(dashboardService.getAdminDashboard());
    }

    // --- Audit Logs ---

    @GetMapping("/audit-logs")
    @Operation(summary = "Get recent audit logs")
    public ResponseEntity<List<AuditLogDto>> getAuditLogs() {
        return ResponseEntity.ok(auditLogService.getRecentLogs());
    }

    @GetMapping("/audit-logs/user/{userId}")
    @Operation(summary = "Get audit logs for a specific user")
    public ResponseEntity<List<AuditLogDto>> getAuditLogsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(auditLogService.getLogsByUser(userId));
    }

    @GetMapping("/audit-logs/action/{action}")
    @Operation(summary = "Get audit logs by action type")
    public ResponseEntity<List<AuditLogDto>> getAuditLogsByAction(@PathVariable String action) {
        return ResponseEntity.ok(auditLogService.getLogsByAction(action));
    }

    // --- Cross-Store Comparison ---

    @GetMapping("/stores/comparison")
    @Operation(summary = "Cross-store comparison report")
    public ResponseEntity<List<DashboardDto.StoreComparison>> getStoreComparison() {
        return ResponseEntity.ok(dashboardService.getStoreComparison());
    }

    // --- Customer Segmentation ---

    @GetMapping("/customers/segmentation")
    @Operation(summary = "Customer segmentation by membership type")
    public ResponseEntity<DashboardDto.CustomerSegmentation> getCustomerSegmentation() {
        return ResponseEntity.ok(dashboardService.getCustomerSegmentation());
    }

    // --- System Settings ---

    @GetMapping("/settings")
    @Operation(summary = "Get platform settings")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(systemSettingsService.getAll());
    }

    @PutMapping("/settings")
    @Operation(summary = "Update platform settings")
    public ResponseEntity<Map<String, Object>> updateSettings(@RequestBody Map<String, Object> settings, Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        Map<String, Object> updated = systemSettingsService.update(settings, p.getEmail());
        auditLogService.log(p.getUserId(), p.getEmail(), "UPDATE", "SETTINGS", null,
                "Updated platform settings: " + String.join(", ", settings.keySet()));
        return ResponseEntity.ok(updated);
    }

    // --- Export ---

    @GetMapping("/export/orders")
    @Operation(summary = "Export all orders as CSV")
    public void exportOrders(HttpServletResponse response) {
        exportService.exportOrdersCsv(response);
    }

    @GetMapping("/export/products")
    @Operation(summary = "Export all products as CSV")
    public void exportProducts(HttpServletResponse response) {
        exportService.exportProductsCsv(response);
    }

    @GetMapping("/export/users")
    @Operation(summary = "Export all users as CSV")
    public void exportUsers(HttpServletResponse response) {
        exportService.exportUsersCsv(response);
    }
}

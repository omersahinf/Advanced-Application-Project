package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.DashboardDto;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/individual")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<DashboardDto.IndividualDashboard> getIndividualDashboard(Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        return ResponseEntity.ok(dashboardService.getIndividualDashboard(p.getUserId()));
    }

    @GetMapping("/corporate")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<DashboardDto.CorporateDashboard> getCorporateDashboard(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        return ResponseEntity.ok(dashboardService.getCorporateDashboard(p.getUserId(), startDate, endDate));
    }

    @GetMapping("/corporate/customers")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<DashboardDto.CustomerSegmentation> getCorporateCustomerSegmentation(Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        return ResponseEntity.ok(dashboardService.getCorporateCustomerSegmentation(p.getUserId()));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<DashboardDto.AdminDashboard> getAdminDashboard() {
        return ResponseEntity.ok(dashboardService.getAdminDashboard());
    }
}

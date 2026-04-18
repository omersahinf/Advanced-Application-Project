package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.CustomerProfileDto;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.CustomerProfileService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profiles")
public class CustomerProfileController {

    private final CustomerProfileService profileService;

    public CustomerProfileController(CustomerProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<CustomerProfileDto> getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(CustomerProfileDto.from(profileService.getByOwnerId(principal.getUserId())));
    }

    @PutMapping("/my")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<CustomerProfileDto> updateMyProfile(@AuthenticationPrincipal UserPrincipal principal,
                                                              @RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(CustomerProfileDto.from(profileService.updateOwn(principal.getUserId(), updates)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<CustomerProfileDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(CustomerProfileDto.from(profileService.getById(id)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<CustomerProfileDto>> getAll(Pageable pageable) {
        return ResponseEntity.ok(profileService.getAll(pageable).map(CustomerProfileDto::from));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        profileService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

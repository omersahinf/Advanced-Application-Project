package com.demo.ecommerce.service;

import com.demo.ecommerce.entity.CustomerProfile;
import com.demo.ecommerce.entity.MembershipType;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.repository.CustomerProfileRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class CustomerProfileService {

    private final CustomerProfileRepository profileRepository;

    public CustomerProfileService(CustomerProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    public CustomerProfile getByOwnerId(Long userId) {
        return profileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerProfile for user " + userId + " not found"));
    }

    public CustomerProfile getById(Long id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerProfile", id));
    }

    public Page<CustomerProfile> getAll(Pageable pageable) {
        return profileRepository.findAll(pageable);
    }

    @Transactional
    public CustomerProfile updateOwn(Long userId, Map<String, Object> updates) {
        CustomerProfile profile = profileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerProfile for user " + userId + " not found"));
        applyUpdates(profile, updates);
        return profileRepository.save(profile);
    }

    @Transactional
    public void delete(Long id) {
        if (!profileRepository.existsById(id)) {
            throw new ResourceNotFoundException("CustomerProfile", id);
        }
        profileRepository.deleteById(id);
    }

    private void applyUpdates(CustomerProfile profile, Map<String, Object> updates) {
        if (updates.containsKey("age")) {
            profile.setAge(((Number) updates.get("age")).intValue());
        }
        if (updates.containsKey("city")) {
            profile.setCity((String) updates.get("city"));
        }
        if (updates.containsKey("membershipType")) {
            profile.setMembershipType(MembershipType.valueOf((String) updates.get("membershipType")));
        }
        if (updates.containsKey("satisfactionLevel")) {
            profile.setSatisfactionLevel((String) updates.get("satisfactionLevel"));
        }
    }
}

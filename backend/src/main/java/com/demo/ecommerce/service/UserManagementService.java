package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.RegisterRequest;
import com.demo.ecommerce.dto.UpdateProfileRequest;
import com.demo.ecommerce.dto.UserDto;
import com.demo.ecommerce.entity.CustomerProfile;
import com.demo.ecommerce.entity.MembershipType;
import com.demo.ecommerce.entity.RoleType;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.exception.BadRequestException;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.repository.CustomerProfileRepository;
import com.demo.ecommerce.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class UserManagementService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public UserManagementService(UserRepository userRepository,
                                  CustomerProfileRepository customerProfileRepository,
                                  PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserDto::from)
                .collect(Collectors.toList());
    }

    public Page<UserDto> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(UserDto::from);
    }

    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return UserDto.from(user);
    }

    public List<UserDto> getUsersByRole(String role) {
        RoleType roleType = RoleType.valueOf(role.toUpperCase());
        return userRepository.findAll().stream()
                .filter(u -> u.getRoleType() == roleType)
                .map(UserDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto registerIndividual(RegisterRequest req) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new BadRequestException("Email already in use");
        }

        User user = new User();
        user.setFirstName(req.getFirstName());
        user.setLastName(req.getLastName());
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRoleType(RoleType.INDIVIDUAL);
        user.setGender(req.getGender());

        User saved = userRepository.save(user);

        CustomerProfile profile = new CustomerProfile();
        profile.setOwner(saved);
        profile.setTotalSpend(BigDecimal.ZERO);
        profile.setItemsPurchased(0);
        profile.setAvgRating(BigDecimal.ZERO);
        profile.setDiscountApplied(false);
        profile.setPriorPurchases(0);
        profile.setMembershipType(MembershipType.BRONZE);
        profile.setSatisfactionLevel("Neutral");
        saved.setCustomerProfile(profile);

        return UserDto.from(userRepository.save(saved));
    }

    @Transactional
    public UserDto createCorporateUser(RegisterRequest req) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new BadRequestException("Email already in use");
        }

        User user = new User();
        user.setFirstName(req.getFirstName());
        user.setLastName(req.getLastName());
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRoleType(RoleType.CORPORATE);
        user.setGender(req.getGender());

        return UserDto.from(userRepository.save(user));
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (req.getFirstName() != null) user.setFirstName(req.getFirstName());
        if (req.getLastName() != null) user.setLastName(req.getLastName());
        if (req.getGender() != null) user.setGender(req.getGender());

        User saved = userRepository.save(user);

        // Update CustomerProfile fields if user is INDIVIDUAL
        if (user.getRoleType() == RoleType.INDIVIDUAL) {
            customerProfileRepository.findByOwnerId(userId).ifPresent(cp -> {
                if (req.getAge() != null) cp.setAge(req.getAge());
                if (req.getCity() != null) cp.setCity(req.getCity());
                customerProfileRepository.save(cp);
            });
        }

        return UserDto.from(saved);
    }

    @Transactional
    public void setSuspended(Long id, boolean suspended) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        user.setSuspended(suspended);
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", id);
        }
        userRepository.deleteById(id);
    }
}

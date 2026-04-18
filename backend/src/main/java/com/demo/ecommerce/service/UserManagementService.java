package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.AdminCreateUserRequest;
import com.demo.ecommerce.dto.RegisterRequest;
import com.demo.ecommerce.dto.UpdateProfileRequest;
import com.demo.ecommerce.dto.UserDto;
import com.demo.ecommerce.entity.CustomerProfile;
import com.demo.ecommerce.entity.MembershipType;
import com.demo.ecommerce.entity.RoleType;
import com.demo.ecommerce.entity.Store;
import com.demo.ecommerce.entity.StoreStatus;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.exception.BadRequestException;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.repository.CustomerProfileRepository;
import com.demo.ecommerce.repository.StoreRepository;
import com.demo.ecommerce.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserManagementService {

    private static final Logger log = LoggerFactory.getLogger(UserManagementService.class);

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    public UserManagementService(UserRepository userRepository,
                                  CustomerProfileRepository customerProfileRepository,
                                  StoreRepository storeRepository,
                                  PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.storeRepository = storeRepository;
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
        return createUser(req.getFirstName(), req.getLastName(), req.getEmail(), req.getPassword(),
                req.getGender(), RoleType.INDIVIDUAL);
    }

    @Transactional
    public UserDto createCorporateUser(RegisterRequest req) {
        return createUser(req.getFirstName(), req.getLastName(), req.getEmail(), req.getPassword(),
                req.getGender(), RoleType.CORPORATE);
    }

    @Transactional
    public UserDto createManagedUser(AdminCreateUserRequest req) {
        if (req.getRole() == RoleType.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be created from user management");
        }
        UserDto created = createUser(req.getFirstName(), req.getLastName(), req.getEmail(), req.getPassword(),
                req.getGender(), req.getRole());
        if (req.getRole() == RoleType.CORPORATE) {
            createPendingStore(created.getId(), req.getStoreName(), req.getStoreDescription());
            return getUserById(created.getId());
        }
        return created;
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

    private UserDto createUser(String firstName, String lastName, String email, String password,
                               String gender, RoleType roleType) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new BadRequestException("Email already in use");
        }

        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRoleType(roleType);
        user.setGender(gender);

        User saved = userRepository.save(user);
        if (roleType == RoleType.INDIVIDUAL) {
            attachDefaultCustomerProfile(saved);
            saved = userRepository.save(saved);
        }
        return UserDto.from(saved);
    }

    private void attachDefaultCustomerProfile(User saved) {
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
    }

    private void createPendingStore(Long ownerId, String storeName, String storeDescription) {
        if (storeName == null || storeName.isBlank()) {
            throw new BadRequestException("Store name is required for corporate accounts");
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerId));

        Store store = new Store();
        store.setOwner(owner);
        store.setName(storeName.trim());
        store.setDescription(storeDescription);
        store.setStatus(StoreStatus.PENDING_APPROVAL);
        storeRepository.save(store);
        owner.getStores().add(store);
    }
}

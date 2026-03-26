package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.CreateStoreRequest;
import com.demo.ecommerce.dto.StoreDto;
import com.demo.ecommerce.entity.Store;
import com.demo.ecommerce.entity.StoreStatus;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.exception.UnauthorizedOperationException;
import com.demo.ecommerce.repository.StoreRepository;
import com.demo.ecommerce.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StoreService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    public StoreService(StoreRepository storeRepository, UserRepository userRepository) {
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
    }

    public List<StoreDto> getAllStores() {
        return storeRepository.findAll().stream()
                .map(StoreDto::from)
                .collect(Collectors.toList());
    }

    public List<StoreDto> getStoresByOwner(Long ownerId) {
        return storeRepository.findByOwnerId(ownerId).stream()
                .map(StoreDto::from)
                .collect(Collectors.toList());
    }

    public StoreDto getStoreById(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));
        return StoreDto.from(store);
    }

    @Transactional
    public StoreDto createStore(Long ownerId, CreateStoreRequest req) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Store store = new Store();
        store.setOwner(owner);
        store.setName(req.getName());
        store.setDescription(req.getDescription());
        store.setStatus(StoreStatus.PENDING_APPROVAL);
        return StoreDto.from(storeRepository.save(store));
    }

    @Transactional
    public StoreDto updateStore(Long storeId, Long ownerId, CreateStoreRequest req) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));
        if (!store.getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedOperationException("Not authorized to update this store");
        }
        store.setName(req.getName());
        store.setDescription(req.getDescription());
        return StoreDto.from(storeRepository.save(store));
    }

    @Transactional
    public StoreDto updateStoreStatus(Long storeId, StoreStatus status) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));
        store.setStatus(status);
        return StoreDto.from(storeRepository.save(store));
    }

    public List<StoreDto> getStoresByStatus(StoreStatus status) {
        return storeRepository.findByStatus(status).stream()
                .map(StoreDto::from)
                .collect(Collectors.toList());
    }
}

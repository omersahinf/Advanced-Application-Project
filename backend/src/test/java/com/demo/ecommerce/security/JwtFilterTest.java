package com.demo.ecommerce.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

class JwtFilterTest {

    @Test
    void filterAlsoRunsOnAsyncDispatch() {
        JwtFilter filter = new JwtFilter(null);
        assertFalse(filter.shouldNotFilterAsyncDispatch());
    }
}

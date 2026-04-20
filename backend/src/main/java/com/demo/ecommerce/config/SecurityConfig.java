package com.demo.ecommerce.config;

import com.demo.ecommerce.security.JwtFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final com.demo.ecommerce.security.RateLimitFilter rateLimitFilter;

    @Value("${app.cors.origins:http://localhost:4200}")
    private String corsOrigins;

    public SecurityConfig(JwtFilter jwtFilter, com.demo.ecommerce.security.RateLimitFilter rateLimitFilter) {
        this.jwtFilter = jwtFilter;
        this.rateLimitFilter = rateLimitFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                // Public
                auth.requestMatchers("/api/auth/login").permitAll();
                auth.requestMatchers("/api/auth/register").permitAll();
                auth.requestMatchers("/api/auth/refresh").permitAll();
                auth.requestMatchers("/api/auth/logout").permitAll();

                // Swagger / OpenAPI
                auth.requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").permitAll();

                // Admin-only endpoints
                auth.requestMatchers("/api/admin/**").hasAuthority("ADMIN");

                // Cart endpoints for individual users
                auth.requestMatchers("/api/cart/**").hasAuthority("INDIVIDUAL");

                // Corporate-only endpoints
                auth.requestMatchers("/api/store/my/**").hasAnyAuthority("CORPORATE", "ADMIN");

                // Product browsing is open to all authenticated users
                auth.requestMatchers(HttpMethod.GET, "/api/products/**").authenticated();
                auth.requestMatchers(HttpMethod.GET, "/api/categories/**").authenticated();

                // All other /api/** require authentication (fine-grained via @PreAuthorize)
                auth.requestMatchers("/api/**").authenticated();
                auth.anyRequest().denyAll();
            })
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Unauthorized\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Forbidden - insufficient permissions\"}");
                })
            );

        http.addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(corsOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

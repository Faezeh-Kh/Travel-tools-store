package com.store.traveltools.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// The Cart API is the first part of this app that needs a genuine browser-to-backend request (every
// other endpoint is only ever called server-side, from Next.js Server Components, where CORS doesn't
// apply). allowedOrigins takes an explicit configured origin rather than "*" - required anyway, since
// a wildcard origin is incompatible with credentialed requests (the cart cookie) per the CORS spec.
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String allowedOrigin;

    public CorsConfig(@Value("${app.cors.allowed-origin}") String allowedOrigin) {
        this.allowedOrigin = allowedOrigin;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigin)
                .allowedMethods("GET", "POST", "PATCH", "DELETE")
                .allowCredentials(true);
    }
}

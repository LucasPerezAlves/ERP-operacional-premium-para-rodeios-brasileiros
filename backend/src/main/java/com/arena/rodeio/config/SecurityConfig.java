package com.arena.rodeio.config;

import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * A autenticação do usuário acontece no Supabase Auth (front-end).
 * Esta API atua como OAuth2 Resource Server: cada requisição chega com o
 * access token JWT do Supabase no header Authorization e é validada aqui.
 *
 * O Supabase assina os tokens com HS256 usando o "JWT Secret" do projeto
 * (Dashboard > Project Settings > API > JWT Secret), injetado via
 * SUPABASE_JWT_SECRET. Se o projeto migrar para chaves assimétricas,
 * troque o decoder por NimbusJwtDecoder.withJwkSetUri(...).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${supabase.jwt-secret}")
    private String supabaseJwtSecret;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                // Link de aprovação clicado pela gerência a partir do e-mail
                // (protegido por token HMAC validado no controller)
                .requestMatchers("/api/auth/aprovar").permitAll()
                // Webhook do Supabase (protegido por segredo compartilhado no header)
                .requestMatchers("/api/webhooks/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));

        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder() {
        var secretKey = new SecretKeySpec(
            supabaseJwtSecret.getBytes(StandardCharsets.UTF_8),
            "HmacSHA256");

        return NimbusJwtDecoder.withSecretKey(secretKey)
            .macAlgorithm(MacAlgorithm.HS256)
            .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        var configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

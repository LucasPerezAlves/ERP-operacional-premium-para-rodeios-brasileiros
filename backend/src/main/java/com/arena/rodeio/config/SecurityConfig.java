package com.arena.rodeio.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
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
 * Este projeto usa as JWT Signing Keys assimétricas do Supabase (ES256),
 * não o "JWT Secret" HS256 legado (confirmado inspecionando o header do
 * token: {"alg":"ES256",...}). Por isso a validação usa o endpoint JWKS
 * público do projeto — o Nimbus baixa e cacheia as chaves públicas e
 * resolve o algoritmo automaticamente pelo "kid" no header do token.
 *
 * As roles (MASTER_ADMIN/OPERADOR) não vêm no JWT — são resolvidas por
 * SupabaseJwtAuthenticationConverter a partir de perfis_funcionarios.
 * @EnableMethodSecurity habilita @PreAuthorize nos controllers (RBAC).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    private final SupabaseJwtAuthenticationConverter jwtAuthenticationConverter;

    public SecurityConfig(SupabaseJwtAuthenticationConverter jwtAuthenticationConverter) {
        this.jwtAuthenticationConverter = jwtAuthenticationConverter;
    }

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
                .requestMatchers("/api/webhooks/**").permitAll()
                // Área Pública/Landing — único GET do sistema sem JWT (regra
                // inegociável nº 6, exceção deliberada e restrita a estas rotas).
                .requestMatchers(HttpMethod.GET, "/api/eventos/publicos", "/api/eventos/publicos/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt ->
                jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));

        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder() {
        var jwkSetUri = supabaseUrl.replaceAll("/+$", "") + "/auth/v1/.well-known/jwks.json";

        // NimbusJwtDecoder.withJwkSetUri(...) só aceita RS256 por padrão,
        // mesmo com o JWK Set contendo apenas chaves EC. Sem isto, o
        // seletor de chave descarta a única chave disponível e todo token
        // ES256 (o algoritmo real do Supabase aqui) é rejeitado com
        // "Another algorithm expected, or no matching key(s) found".
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
            .jwsAlgorithm(SignatureAlgorithm.ES256)
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

package com.arena.rodeio.config;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import com.arena.rodeio.model.StatusAprovacao;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;

/**
 * O JWT do Supabase autentica (prova quem é o usuário), mas não carrega a
 * role — MASTER_ADMIN/OPERADOR vive em perfis_funcionarios, no nosso banco.
 * Este conversor faz a ponte: para cada requisição, resolve o "sub" (UUID
 * do usuário) e consulta o perfil para montar as GrantedAuthority.
 *
 * Regra inegociável nº 5 (Aprovação de Gerência) é reforçada aqui, não só
 * no front-end: um perfil PENDENTE ou REJEITADO não recebe nenhuma role,
 * mesmo com um JWT assinado válido. Sem role, @PreAuthorize com hasRole/
 * hasAnyRole nega o acesso — só "authenticated()" continuaria passando,
 * por isso os endpoints usam hasAnyRole em vez de depender só disso.
 *
 * Nota de produção: esta consulta roda em toda requisição autenticada. Se
 * o volume justificar, cachear o perfil por alguns segundos (ex.: Spring
 * Cache com TTL curto) reduz a carga no banco sem comprometer a segurança.
 */
@Component
public class SupabaseJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final Logger log = LoggerFactory.getLogger(SupabaseJwtAuthenticationConverter.class);

    private final PerfilFuncionarioRepository perfilFuncionarioRepository;

    public SupabaseJwtAuthenticationConverter(PerfilFuncionarioRepository perfilFuncionarioRepository) {
        this.perfilFuncionarioRepository = perfilFuncionarioRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        return new JwtAuthenticationToken(jwt, resolverAuthorities(jwt), jwt.getSubject());
    }

    private Collection<GrantedAuthority> resolverAuthorities(Jwt jwt) {
        UUID userId;
        try {
            userId = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            log.warn("JWT com subject que não é um UUID válido: {}", jwt.getSubject());
            return List.of();
        }

        return perfilFuncionarioRepository.findById(userId)
            .filter(perfil -> perfil.getStatusAprovacao() == StatusAprovacao.APROVADO)
            .<Collection<GrantedAuthority>>map(perfil -> List.of(
                new SimpleGrantedAuthority("ROLE_" + perfil.getPerfilAcesso().name())))
            .orElseGet(() -> {
                log.debug("Sem role para o usuário {}: perfil ausente ou não aprovado.", userId);
                return List.of();
            });
    }
}

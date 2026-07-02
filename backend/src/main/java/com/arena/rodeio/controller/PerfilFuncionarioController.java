package com.arena.rodeio.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.PerfilFuncionarioRequest;
import com.arena.rodeio.dto.PerfilFuncionarioResponse;
import com.arena.rodeio.service.PerfilFuncionarioService;

import jakarta.validation.Valid;

/**
 * Gestão de funcionários (rotas autenticadas). Não há POST de criação:
 * o perfil nasce automaticamente via trigger no cadastro do Supabase Auth.
 */
@RestController
@RequestMapping("/api/funcionarios")
public class PerfilFuncionarioController {

    private final PerfilFuncionarioService service;

    public PerfilFuncionarioController(PerfilFuncionarioService service) {
        this.service = service;
    }

    /**
     * Lista todos os funcionários — inclui cargo, limite de sangria, área de
     * trabalho e foto. Correção de segurança: antes não tinha @PreAuthorize
     * (só a checagem genérica authenticated()); esses dados são sensíveis
     * o bastante (regra inegociável nº 6) para ficar restrito à gerência.
     */
    @GetMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<PerfilFuncionarioResponse> listar() {
        return service.listar();
    }

    /** Perfil do funcionário logado ("sub" do JWT do Supabase). */
    @GetMapping("/me")
    public PerfilFuncionarioResponse meuPerfil(@AuthenticationPrincipal Jwt jwt) {
        return service.buscarPorId(UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/{id}")
    public PerfilFuncionarioResponse buscarPorId(@PathVariable UUID id) {
        return service.buscarPorId(id);
    }

    @PutMapping("/{id}")
    public PerfilFuncionarioResponse atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody PerfilFuncionarioRequest request) {
        return service.atualizar(id, request);
    }

    /** Desativação lógica — nunca apagamos histórico financeiro. */
    @DeleteMapping("/{id}")
    public PerfilFuncionarioResponse desativar(@PathVariable UUID id) {
        return service.desativar(id);
    }
}

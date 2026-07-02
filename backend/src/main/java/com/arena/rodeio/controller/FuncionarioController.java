package com.arena.rodeio.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.FuncionarioRequest;
import com.arena.rodeio.dto.FuncionarioResponse;
import com.arena.rodeio.service.FuncionarioService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/funcionarios")
public class FuncionarioController {

    private final FuncionarioService service;

    public FuncionarioController(FuncionarioService service) {
        this.service = service;
    }

    @GetMapping
    public List<FuncionarioResponse> listar() {
        return service.listar();
    }

    /** Perfil do funcionário logado ("sub" do JWT do Supabase). */
    @GetMapping("/me")
    public FuncionarioResponse meuPerfil(@AuthenticationPrincipal Jwt jwt) {
        return service.buscarPorAuthUserId(UUID.fromString(jwt.getSubject()));
    }

    @GetMapping("/{id}")
    public FuncionarioResponse buscarPorId(@PathVariable UUID id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    public ResponseEntity<FuncionarioResponse> criar(
            @Valid @RequestBody FuncionarioRequest request) {
        var criado = service.criar(request);
        return ResponseEntity
            .created(URI.create("/api/funcionarios/" + criado.id()))
            .body(criado);
    }

    @PutMapping("/{id}")
    public FuncionarioResponse atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody FuncionarioRequest request) {
        return service.atualizar(id, request);
    }

    /** Desativação lógica — nunca apagamos histórico financeiro. */
    @DeleteMapping("/{id}")
    public FuncionarioResponse desativar(@PathVariable UUID id) {
        return service.desativar(id);
    }
}

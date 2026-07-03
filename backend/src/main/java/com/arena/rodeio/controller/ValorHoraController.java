package com.arena.rodeio.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.HistoricoValorHoraResponse;
import com.arena.rodeio.dto.SalvarValorHoraRequest;
import com.arena.rodeio.dto.ValorHoraAtualResponse;
import com.arena.rodeio.service.ValorHoraService;

import jakarta.validation.Valid;

/**
 * Configuração de valor/hora dos funcionários (valor global + overrides por
 * área). Exclusivo do MASTER_ADMIN — regra inegociável nº 6.
 */
@RestController
@RequestMapping("/api/valores-hora")
public class ValorHoraController {

    private final ValorHoraService service;

    public ValorHoraController(ValorHoraService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ValorHoraAtualResponse buscarAtual() {
        return service.buscarAtual();
    }

    @GetMapping("/historico")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<HistoricoValorHoraResponse> buscarHistorico() {
        return service.buscarHistorico();
    }

    @PutMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ValorHoraAtualResponse salvar(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SalvarValorHoraRequest request) {
        return service.salvar(UUID.fromString(jwt.getSubject()), request);
    }
}

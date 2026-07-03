package com.arena.rodeio.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.SosAlertaRequest;
import com.arena.rodeio.dto.SosAlertaResponse;
import com.arena.rodeio.service.SosAlertaService;

import jakarta.validation.Valid;

/**
 * SOS Gerência (backlog do Operador item 4 / Master Admin item 1): o
 * acionamento em si viaja por Supabase Realtime Broadcast, instantâneo e
 * sem round-trip por aqui — este endpoint só grava o histórico, para que a
 * gerência não perca o alerta se estava com o painel fechado no momento.
 */
@RestController
@RequestMapping("/api/sos")
public class SosAlertaController {

    private final SosAlertaService sosAlertaService;

    public SosAlertaController(SosAlertaService sosAlertaService) {
        this.sosAlertaService = sosAlertaService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OPERADOR', 'MASTER_ADMIN')")
    public ResponseEntity<SosAlertaResponse> registrar(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SosAlertaRequest request) {
        var alerta = sosAlertaService.registrar(usuarioId(jwt), request);
        return ResponseEntity
            .created(URI.create("/api/sos/" + alerta.id()))
            .body(alerta);
    }

    /** Hidrata o painel do Admin com o que ficou aberto antes desta sessão. */
    @GetMapping("/abertos")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<SosAlertaResponse> listarAbertos() {
        return sosAlertaService.listarAbertos();
    }

    @PutMapping("/{id}/atender")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public SosAlertaResponse atender(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return sosAlertaService.atender(id, usuarioId(jwt));
    }

    private static UUID usuarioId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}

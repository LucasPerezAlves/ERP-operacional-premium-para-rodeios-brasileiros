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

import com.arena.rodeio.dto.EventoRequest;
import com.arena.rodeio.dto.EventoResponse;
import com.arena.rodeio.service.EventoService;

import jakarta.validation.Valid;

/**
 * Sprint 1: CRUD administrativo do Evento (aggregate root da plataforma).
 * Exclusivo do MASTER_ADMIN — sem endpoint público ainda (Landing Page é
 * spec futura). Regra inegociável nº 6: nunca só authenticated().
 */
@RestController
@RequestMapping("/api/eventos")
public class EventoController {

    private final EventoService eventoService;

    public EventoController(EventoService eventoService) {
        this.eventoService = eventoService;
    }

    @PostMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ResponseEntity<EventoResponse> cadastrar(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody EventoRequest request) {
        var evento = eventoService.cadastrar(usuarioId(jwt), request);
        return ResponseEntity
            .created(URI.create("/api/eventos/" + evento.id()))
            .body(evento);
    }

    @GetMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<EventoResponse> listar() {
        return eventoService.listarTodos();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public EventoResponse buscar(@PathVariable UUID id) {
        return eventoService.buscar(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public EventoResponse atualizar(@PathVariable UUID id, @Valid @RequestBody EventoRequest request) {
        return eventoService.atualizar(id, request);
    }

    @PutMapping("/{id}/publicar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public EventoResponse publicar(@PathVariable UUID id) {
        return eventoService.publicar(id);
    }

    @PutMapping("/{id}/despublicar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public EventoResponse despublicar(@PathVariable UUID id) {
        return eventoService.despublicar(id);
    }

    @PutMapping("/{id}/iniciar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public EventoResponse iniciar(@PathVariable UUID id) {
        return eventoService.iniciar(id);
    }

    @PutMapping("/{id}/encerrar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public EventoResponse encerrar(@PathVariable UUID id) {
        return eventoService.encerrar(id);
    }

    @PutMapping("/{id}/cancelar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public EventoResponse cancelar(@PathVariable UUID id) {
        return eventoService.cancelar(id);
    }

    @PutMapping("/{id}/arquivar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public EventoResponse arquivar(@PathVariable UUID id) {
        return eventoService.arquivar(id);
    }

    private static UUID usuarioId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}

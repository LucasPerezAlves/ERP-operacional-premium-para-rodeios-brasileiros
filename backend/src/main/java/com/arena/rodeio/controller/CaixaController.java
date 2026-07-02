package com.arena.rodeio.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.AberturaCaixaRequest;
import com.arena.rodeio.dto.CaixaResponse;
import com.arena.rodeio.dto.FecharCaixaRequest;
import com.arena.rodeio.dto.SangriaRequest;
import com.arena.rodeio.dto.SangriaResponse;
import com.arena.rodeio.dto.VendaRequest;
import com.arena.rodeio.dto.VendaResponse;
import com.arena.rodeio.service.CaixaService;
import com.arena.rodeio.service.VendaService;

import jakarta.validation.Valid;

/**
 * Módulo 2: Caixas, Vendas e Sangrias.
 * RBAC: hasAnyRole/hasRole (nunca só authenticated() — regra inegociável
 * nº 6). Abrir/fechar são exclusivos do MASTER_ADMIN (regra inegociável
 * nº 7) — o Operador só vende e consulta o próprio status.
 */
@RestController
@RequestMapping("/api/caixas")
public class CaixaController {

    private final CaixaService caixaService;
    private final VendaService vendaService;

    public CaixaController(CaixaService caixaService, VendaService vendaService) {
        this.caixaService = caixaService;
        this.vendaService = vendaService;
    }

    /**
     * Abre um caixa PARA um operador escolhido pelo Admin. O dono do caixa
     * (request.operadorId) nunca é quem chama este endpoint.
     */
    @PostMapping("/abrir")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ResponseEntity<CaixaResponse> abrir(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AberturaCaixaRequest request) {
        var caixa = caixaService.abrir(usuarioId(jwt), request);
        return ResponseEntity
            .created(URI.create("/api/caixas/" + caixa.id()))
            .body(caixa);
    }

    /**
     * Status do próprio caixa do Operador logado ("Aguardando gerência abrir
     * caixa" vs. "Caixa Aberto: R$ X"). 204 (sem corpo) quando não há turno
     * aberto — não é um erro, é o estado normal antes do Admin abrir.
     */
    @GetMapping("/meu")
    @PreAuthorize("hasAnyRole('OPERADOR', 'MASTER_ADMIN')")
    public ResponseEntity<CaixaResponse> meuCaixa(@AuthenticationPrincipal Jwt jwt) {
        return caixaService.buscarMeuCaixaAberto(usuarioId(jwt))
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * Lança uma venda no caixa. Se em DINHEIRO e o limite do operador for
     * atingido, a resposta traz alerta = "ALERTA_SANGRIA_ATINGIDO".
     */
    @PostMapping("/{id}/vender")
    @PreAuthorize("hasAnyRole('OPERADOR', 'MASTER_ADMIN')")
    public ResponseEntity<VendaResponse> vender(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication,
            @Valid @RequestBody VendaRequest request) {
        var venda = vendaService.registrar(id, usuarioId(jwt), isMasterAdmin(authentication), request);
        return ResponseEntity
            .created(URI.create("/api/caixas/" + id + "/vendas/" + venda.id()))
            .body(venda);
    }

    /** Recolhimento de espécie — exclusivo da gerência (regra de negócio nº 2). */
    @PostMapping("/{id}/sangria")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ResponseEntity<SangriaResponse> sangria(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SangriaRequest request) {
        var sangria = caixaService.registrarSangria(id, usuarioId(jwt), request);
        return ResponseEntity
            .created(URI.create("/api/caixas/" + id + "/sangrias/" + sangria.id()))
            .body(sangria);
    }

    /** Fecha o turno — exclusivo do MASTER_ADMIN (regra inegociável nº 7). */
    @PutMapping("/{id}/fechar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public CaixaResponse fechar(
            @PathVariable UUID id,
            @Valid @RequestBody FecharCaixaRequest request) {
        return caixaService.fechar(id, request);
    }

    /** Lista todos os caixas abertos — tela Gerenciamento de Equipe. */
    @GetMapping("/abertos")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<CaixaResponse> listarAbertos() {
        return caixaService.listarAbertos();
    }

    private static UUID usuarioId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    private static boolean isMasterAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
            .anyMatch(authority -> "ROLE_MASTER_ADMIN".equals(authority.getAuthority()));
    }
}

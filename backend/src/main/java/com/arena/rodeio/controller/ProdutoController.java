package com.arena.rodeio.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.ProdutoRequest;
import com.arena.rodeio.dto.ProdutoResponse;
import com.arena.rodeio.service.ProdutoService;

import jakarta.validation.Valid;

/**
 * Módulo 3, peça 1/6: cadastro de estoque. Exclusivo do MASTER_ADMIN
 * (regra inegociável nº 6) — o Operador não participa deste sub-projeto.
 */
@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoService produtoService;

    public ProdutoController(ProdutoService produtoService) {
        this.produtoService = produtoService;
    }

    @PostMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ResponseEntity<ProdutoResponse> cadastrar(@Valid @RequestBody ProdutoRequest request) {
        var produto = produtoService.cadastrar(request);
        return ResponseEntity
            .created(URI.create("/api/produtos/" + produto.id()))
            .body(produto);
    }

    @GetMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<ProdutoResponse> listar() {
        return produtoService.listarAtivos();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ProdutoResponse atualizar(@PathVariable UUID id, @Valid @RequestBody ProdutoRequest request) {
        return produtoService.atualizar(id, request);
    }

    /** Desativação lógica — nunca apagamos o produto (referências futuras de vendas/cargas). */
    @PutMapping("/{id}/desativar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ProdutoResponse desativar(@PathVariable UUID id) {
        return produtoService.desativar(id);
    }
}

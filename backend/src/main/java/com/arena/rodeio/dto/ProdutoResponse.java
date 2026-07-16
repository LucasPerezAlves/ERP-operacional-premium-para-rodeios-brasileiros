package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.CategoriaProduto;
import com.arena.rodeio.model.Produto;

public record ProdutoResponse(
    UUID id,
    String nome,
    CategoriaProduto categoria,
    int quantidadeEstoque,
    BigDecimal valorVenda,
    BigDecimal valorCusto,
    boolean ativo,
    Instant criadoEm,
    Instant atualizadoEm
) {

    public static ProdutoResponse from(Produto produto) {
        return new ProdutoResponse(
            produto.getId(),
            produto.getNome(),
            produto.getCategoria(),
            produto.getQuantidadeEstoque(),
            produto.getValorVenda(),
            produto.getValorCusto(),
            produto.isAtivo(),
            produto.getCriadoEm(),
            produto.getAtualizadoEm());
    }
}

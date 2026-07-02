package com.arena.rodeio.repository;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.arena.rodeio.model.FormaPagamento;
import com.arena.rodeio.model.Venda;

public interface VendaRepository extends JpaRepository<Venda, UUID> {

    /**
     * Soma agregada direto no banco (NUMERIC → BigDecimal), nunca somando
     * linha a linha em memória. coalesce garante ZERO para caixa sem vendas.
     */
    @Query("""
        select coalesce(sum(v.valor), 0)
        from Venda v
        where v.caixa.id = :caixaId
          and v.formaPagamento = :formaPagamento
        """)
    BigDecimal somarPorCaixaEFormaPagamento(
        @Param("caixaId") UUID caixaId,
        @Param("formaPagamento") FormaPagamento formaPagamento);
}

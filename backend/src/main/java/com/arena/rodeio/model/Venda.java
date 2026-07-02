package com.arena.rodeio.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Lançamento de venda imutável: uma vez registrada, nenhum campo muda.
 * Correções futuras serão feitas por estorno (lançamento inverso), nunca
 * por edição — trilha de auditoria é inegociável em sistema financeiro.
 */
@Entity
@Table(name = "vendas")
public class Venda {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "caixa_id", nullable = false, updatable = false)
    private Caixa caixa;

    @Column(nullable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(name = "forma_pagamento", nullable = false, updatable = false, length = 10)
    private FormaPagamento formaPagamento;

    @Column(name = "registrada_em", nullable = false, updatable = false)
    private Instant registradaEm;

    protected Venda() {
        // exigido pelo JPA
    }

    public Venda(Caixa caixa, BigDecimal valor, FormaPagamento formaPagamento) {
        this.caixa = caixa;
        this.valor = valor;
        this.formaPagamento = formaPagamento;
    }

    @PrePersist
    void aoCriar() {
        this.registradaEm = Instant.now();
    }

    // --- getters ---

    public UUID getId() {
        return id;
    }

    public Caixa getCaixa() {
        return caixa;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public FormaPagamento getFormaPagamento() {
        return formaPagamento;
    }

    public Instant getRegistradaEm() {
        return registradaEm;
    }
}

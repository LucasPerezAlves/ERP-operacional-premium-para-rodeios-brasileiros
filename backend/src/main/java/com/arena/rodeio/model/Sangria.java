package com.arena.rodeio.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Recolhimento de dinheiro físico do caixa por um MASTER_ADMIN
 * (regra de negócio nº 2). Imutável, como todo lançamento financeiro.
 */
@Entity
@Table(name = "sangrias")
public class Sangria {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "caixa_id", nullable = false, updatable = false)
    private Caixa caixa;

    /** Id do MASTER_ADMIN que recolheu o dinheiro ("sub" do JWT). */
    @Column(name = "admin_id", nullable = false, updatable = false)
    private UUID adminId;

    @Column(nullable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Column(name = "registrada_em", nullable = false, updatable = false)
    private Instant registradaEm;

    protected Sangria() {
        // exigido pelo JPA
    }

    public Sangria(Caixa caixa, UUID adminId, BigDecimal valor) {
        this.caixa = caixa;
        this.adminId = adminId;
        this.valor = valor;
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

    public UUID getAdminId() {
        return adminId;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public Instant getRegistradaEm() {
        return registradaEm;
    }
}

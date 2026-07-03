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
 * Histórico do SOS Gerência (Master Admin backlog, item 1). O acionamento em
 * si viaja por Supabase Realtime Broadcast (instantâneo); este registro só
 * garante que a gerência veja o alerta mesmo se estava offline no momento.
 */
@Entity
@Table(name = "sos_alertas")
public class SosAlerta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "caixa_id", nullable = false, updatable = false)
    private Caixa caixa;

    @Column(name = "operador_id", nullable = false, updatable = false)
    private UUID operadorId;

    @Column(name = "operador_nome", nullable = false, updatable = false)
    private String operadorNome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private CategoriaSos categoria;

    @Column(name = "saldo_em_especie", nullable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal saldoEmEspecie;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusSos status = StatusSos.ABERTO;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atendido_por_admin_id")
    private UUID atendidoPorAdminId;

    @Column(name = "atendido_em")
    private Instant atendidoEm;

    protected SosAlerta() {
        // exigido pelo JPA
    }

    public SosAlerta(Caixa caixa, UUID operadorId, String operadorNome, CategoriaSos categoria,
            BigDecimal saldoEmEspecie) {
        this.caixa = caixa;
        this.operadorId = operadorId;
        this.operadorNome = operadorNome;
        this.categoria = categoria;
        this.saldoEmEspecie = saldoEmEspecie;
    }

    @PrePersist
    void aoCriar() {
        this.criadoEm = Instant.now();
    }

    public void atender(UUID adminId) {
        this.status = StatusSos.ATENDIDO;
        this.atendidoPorAdminId = adminId;
        this.atendidoEm = Instant.now();
    }

    // --- getters ---

    public UUID getId() {
        return id;
    }

    public Caixa getCaixa() {
        return caixa;
    }

    public UUID getOperadorId() {
        return operadorId;
    }

    public String getOperadorNome() {
        return operadorNome;
    }

    public CategoriaSos getCategoria() {
        return categoria;
    }

    public BigDecimal getSaldoEmEspecie() {
        return saldoEmEspecie;
    }

    public StatusSos getStatus() {
        return status;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public UUID getAtendidoPorAdminId() {
        return atendidoPorAdminId;
    }

    public Instant getAtendidoEm() {
        return atendidoEm;
    }
}

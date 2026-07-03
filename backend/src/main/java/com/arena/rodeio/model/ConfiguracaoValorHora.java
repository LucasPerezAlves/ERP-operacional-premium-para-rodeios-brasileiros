package com.arena.rodeio.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Valor/hora pago aos funcionários: um valor GLOBAL (padrão) e overrides
 * opcionais por AREA. Cada alteração cria uma nova versão (vigência) em vez
 * de sobrescrever a anterior — histórico auditável (quem/quando alterou).
 */
@Entity
@Table(name = "configuracoes_valor_hora")
public class ConfiguracaoValorHora {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private EscopoValorHora escopo;

    /** Só preenchido quando escopo == AREA. */
    @Column(name = "area_trabalho", length = 60, updatable = false)
    private String areaTrabalho;

    @Column(name = "valor_hora", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal valorHora;

    @Column(name = "vigencia_inicio", nullable = false, updatable = false)
    private Instant vigenciaInicio;

    @Column(name = "vigencia_fim")
    private Instant vigenciaFim;

    @Column(nullable = false)
    private boolean ativo = true;

    /** MASTER_ADMIN que fez esta alteração ("sub" do JWT). */
    @Column(name = "criado_por_admin_id", nullable = false, updatable = false)
    private UUID criadoPorAdminId;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    protected ConfiguracaoValorHora() {
        // exigido pelo JPA
    }

    public ConfiguracaoValorHora(EscopoValorHora escopo, String areaTrabalho, BigDecimal valorHora, UUID criadoPorAdminId) {
        this.escopo = escopo;
        this.areaTrabalho = areaTrabalho;
        this.valorHora = valorHora;
        this.criadoPorAdminId = criadoPorAdminId;
    }

    @PrePersist
    void aoCriar() {
        var agora = Instant.now();
        this.criadoEm = agora;
        this.vigenciaInicio = agora;
    }

    /** Fecha a vigência deste registro — substituído por uma nova versão ou simplesmente removido. */
    public void encerrar() {
        this.ativo = false;
        this.vigenciaFim = Instant.now();
    }

    // --- getters ---

    public UUID getId() {
        return id;
    }

    public EscopoValorHora getEscopo() {
        return escopo;
    }

    public String getAreaTrabalho() {
        return areaTrabalho;
    }

    public BigDecimal getValorHora() {
        return valorHora;
    }

    public Instant getVigenciaInicio() {
        return vigenciaInicio;
    }

    public Instant getVigenciaFim() {
        return vigenciaFim;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public UUID getCriadoPorAdminId() {
        return criadoPorAdminId;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}

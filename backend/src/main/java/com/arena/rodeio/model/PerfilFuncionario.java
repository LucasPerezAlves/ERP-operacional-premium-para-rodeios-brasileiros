package com.arena.rodeio.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Perfil operacional do funcionário, 1:1 com auth.users do Supabase
 * (a PK é o próprio id do usuário no Supabase Auth).
 *
 * A LINHA É CRIADA PELA TRIGGER do banco (002_perfis_funcionarios.sql) no
 * momento do cadastro — o back-end apenas lê e atualiza, nunca insere.
 *
 * REGRA INEGOCIÁVEL: valores monetários são sempre BigDecimal / NUMERIC(12,2).
 */
@Entity
@Table(name = "perfis_funcionarios")
public class PerfilFuncionario {

    /** Mesmo id de auth.users (claim "sub" do JWT). */
    @Id
    private UUID id;

    @Column(name = "nome_completo", nullable = false)
    private String nomeCompleto;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CargoFuncionario cargo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_aprovacao", nullable = false, length = 10)
    private StatusAprovacao statusAprovacao;

    @Enumerated(EnumType.STRING)
    @Column(name = "perfil_acesso", nullable = false, length = 20)
    private PerfilAcesso perfilAcesso;

    /** Posto do funcionário no evento (ex.: "Bar de Fora", "Portaria"). */
    @Column(name = "area_trabalho", length = 60)
    private String areaTrabalho;

    /** URL pública da foto no bucket fotos-funcionarios (Supabase Storage). */
    @Column(name = "foto_url", length = 500)
    private String fotoUrl;

    /**
     * Limiares de espécie em caixa que escalam o NivelAlertaNumerario da
     * gerência (regra de negócio nº 2). Nunca bloqueiam venda — só alertam.
     */
    @Column(name = "limite_atencao", nullable = false, precision = 12, scale = 2)
    private BigDecimal limiteAtencao;

    @Column(name = "limite_critico", nullable = false, precision = 12, scale = 2)
    private BigDecimal limiteCritico;

    /**
     * PIN de 4 dígitos para acesso rápido em terminais compartilhados
     * (regra de negócio nº 4). Armazenar apenas o hash em módulos futuros.
     */
    @Column(name = "pin_hash")
    private String pinHash;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected PerfilFuncionario() {
        // exigido pelo JPA
    }

    @PreUpdate
    void aoAtualizar() {
        this.atualizadoEm = Instant.now();
    }

    // --- getters / setters ---

    public UUID getId() {
        return id;
    }

    public String getNomeCompleto() {
        return nomeCompleto;
    }

    public void setNomeCompleto(String nomeCompleto) {
        this.nomeCompleto = nomeCompleto;
    }

    public String getEmail() {
        return email;
    }

    public CargoFuncionario getCargo() {
        return cargo;
    }

    public void setCargo(CargoFuncionario cargo) {
        this.cargo = cargo;
    }

    public StatusAprovacao getStatusAprovacao() {
        return statusAprovacao;
    }

    public void setStatusAprovacao(StatusAprovacao statusAprovacao) {
        this.statusAprovacao = statusAprovacao;
    }

    public PerfilAcesso getPerfilAcesso() {
        return perfilAcesso;
    }

    public void setPerfilAcesso(PerfilAcesso perfilAcesso) {
        this.perfilAcesso = perfilAcesso;
    }

    public String getAreaTrabalho() {
        return areaTrabalho;
    }

    public void setAreaTrabalho(String areaTrabalho) {
        this.areaTrabalho = areaTrabalho;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }

    public BigDecimal getLimiteAtencao() {
        return limiteAtencao;
    }

    public void setLimiteAtencao(BigDecimal limiteAtencao) {
        this.limiteAtencao = limiteAtencao;
    }

    public BigDecimal getLimiteCritico() {
        return limiteCritico;
    }

    public void setLimiteCritico(BigDecimal limiteCritico) {
        this.limiteCritico = limiteCritico;
    }

    public String getPinHash() {
        return pinHash;
    }

    public void setPinHash(String pinHash) {
        this.pinHash = pinHash;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public void setAtivo(boolean ativo) {
        this.ativo = ativo;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}

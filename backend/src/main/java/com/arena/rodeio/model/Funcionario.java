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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Funcionário do evento. O login administrativo (e-mail/senha) vive no
 * Supabase Auth; esta entidade guarda o perfil operacional e é ligada ao
 * usuário do Supabase pelo {@code authUserId} (claim "sub" do JWT).
 *
 * REGRA INEGOCIÁVEL: valores monetários são sempre BigDecimal / NUMERIC(12,2).
 */
@Entity
@Table(name = "funcionarios")
public class Funcionario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Claim "sub" do JWT do Supabase (auth.users.id). Nulo até o convite ser aceito. */
    @Column(name = "auth_user_id", unique = true)
    private UUID authUserId;

    @NotBlank
    @Column(name = "nome_completo", nullable = false)
    private String nomeCompleto;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CargoFuncionario cargo;

    /**
     * Limite de dinheiro em espécie que o operador pode acumular antes de o
     * sistema exigir uma Sangria (regra de negócio nº 2).
     */
    @NotNull
    @Column(name = "limite_sangria", nullable = false, precision = 12, scale = 2)
    private BigDecimal limiteSangria;

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

    protected Funcionario() {
        // exigido pelo JPA
    }

    public Funcionario(String nomeCompleto,
                       String email,
                       CargoFuncionario cargo,
                       BigDecimal limiteSangria) {
        this.nomeCompleto = nomeCompleto;
        this.email = email;
        this.cargo = cargo;
        this.limiteSangria = limiteSangria;
    }

    @PrePersist
    void aoCriar() {
        var agora = Instant.now();
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    @PreUpdate
    void aoAtualizar() {
        this.atualizadoEm = Instant.now();
    }

    // --- getters / setters ---

    public UUID getId() {
        return id;
    }

    public UUID getAuthUserId() {
        return authUserId;
    }

    public void setAuthUserId(UUID authUserId) {
        this.authUserId = authUserId;
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

    public void setEmail(String email) {
        this.email = email;
    }

    public CargoFuncionario getCargo() {
        return cargo;
    }

    public void setCargo(CargoFuncionario cargo) {
        this.cargo = cargo;
    }

    public BigDecimal getLimiteSangria() {
        return limiteSangria;
    }

    public void setLimiteSangria(BigDecimal limiteSangria) {
        this.limiteSangria = limiteSangria;
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

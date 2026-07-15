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
 * Turno de caixa de um operador. O saldo em espécie NUNCA é armazenado:
 * é sempre derivado de saldo_inicial + vendas em DINHEIRO − sangrias,
 * garantindo que o valor não possa divergir dos lançamentos.
 *
 * Regra inegociável nº 7: o Operador nunca abre o próprio caixa — por isso
 * operadorId (dono do caixa) e abertoPorAdminId (quem executou a abertura)
 * são sempre pessoas diferentes.
 */
@Entity
@Table(name = "caixas")
public class Caixa {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Id do funcionário dono do caixa (perfis_funcionarios.id / "sub" do JWT). */
    @Column(name = "operador_id", nullable = false, updatable = false)
    private UUID operadorId;

    /** Id do MASTER_ADMIN que executou a abertura. */
    @Column(name = "aberto_por_admin_id", nullable = false, updatable = false)
    private UUID abertoPorAdminId;

    @Column(name = "saldo_inicial", nullable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal saldoInicial;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusCaixa status = StatusCaixa.ABERTO;

    @Column(name = "data_abertura", nullable = false, updatable = false)
    private Instant dataAbertura;

    @Column(name = "data_fechamento")
    private Instant dataFechamento;

    /** Dinheiro contado fisicamente pelo Admin — comparado ao saldo calculado revela sobra/falta. */
    @Column(name = "valor_final_confirmado", precision = 12, scale = 2)
    private BigDecimal valorFinalConfirmado;

    @Column(name = "motivo_fechamento")
    private String motivoFechamento;

    @Column(name = "valor_hora_aplicado", precision = 12, scale = 2)
    private BigDecimal valorHoraAplicado;

    @Column(name = "valor_total_calculado", precision = 12, scale = 2)
    private BigDecimal valorTotalCalculado;

    protected Caixa() {
        // exigido pelo JPA
    }

    public Caixa(UUID operadorId, UUID abertoPorAdminId, BigDecimal saldoInicial) {
        this.operadorId = operadorId;
        this.abertoPorAdminId = abertoPorAdminId;
        this.saldoInicial = saldoInicial;
    }

    @PrePersist
    void aoCriar() {
        this.dataAbertura = Instant.now();
    }

    public void fechar(BigDecimal valorFinalConfirmado, String motivoFechamento,
                        BigDecimal valorHoraAplicado, BigDecimal valorTotalCalculado) {
        this.status = StatusCaixa.FECHADO;
        this.dataFechamento = Instant.now();
        this.valorFinalConfirmado = valorFinalConfirmado;
        this.motivoFechamento = motivoFechamento;
        this.valorHoraAplicado = valorHoraAplicado;
        this.valorTotalCalculado = valorTotalCalculado;
    }

    public boolean estaAberto() {
        return status == StatusCaixa.ABERTO;
    }

    // --- getters ---

    public UUID getId() {
        return id;
    }

    public UUID getOperadorId() {
        return operadorId;
    }

    public UUID getAbertoPorAdminId() {
        return abertoPorAdminId;
    }

    public BigDecimal getSaldoInicial() {
        return saldoInicial;
    }

    public StatusCaixa getStatus() {
        return status;
    }

    public Instant getDataAbertura() {
        return dataAbertura;
    }

    public Instant getDataFechamento() {
        return dataFechamento;
    }

    public BigDecimal getValorFinalConfirmado() {
        return valorFinalConfirmado;
    }

    public String getMotivoFechamento() {
        return motivoFechamento;
    }

    public BigDecimal getValorHoraAplicado() {
        return valorHoraAplicado;
    }

    public BigDecimal getValorTotalCalculado() {
        return valorTotalCalculado;
    }
}

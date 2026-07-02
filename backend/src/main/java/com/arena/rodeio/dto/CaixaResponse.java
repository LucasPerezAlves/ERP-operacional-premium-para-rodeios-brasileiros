package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.Caixa;
import com.arena.rodeio.model.StatusCaixa;

public record CaixaResponse(
    UUID id,
    UUID operadorId,
    UUID abertoPorAdminId,
    BigDecimal saldoInicial,
    StatusCaixa status,
    Instant dataAbertura,
    Instant dataFechamento,
    /** Derivado: saldo_inicial + vendas em DINHEIRO − sangrias. */
    BigDecimal saldoEmEspecie,
    /** Só preenchido após o fechamento: dinheiro contado fisicamente pelo Admin. */
    BigDecimal valorFinalConfirmado,
    String motivoFechamento,
    /**
     * valorFinalConfirmado − saldoEmEspecie: positivo = sobra, negativo =
     * falta. Null enquanto o caixa está aberto (nada foi contado ainda).
     */
    BigDecimal divergencia
) {

    public static CaixaResponse from(Caixa caixa, BigDecimal saldoEmEspecie) {
        var valorFinal = caixa.getValorFinalConfirmado();
        var divergencia = valorFinal == null ? null : valorFinal.subtract(saldoEmEspecie);

        return new CaixaResponse(
            caixa.getId(),
            caixa.getOperadorId(),
            caixa.getAbertoPorAdminId(),
            caixa.getSaldoInicial(),
            caixa.getStatus(),
            caixa.getDataAbertura(),
            caixa.getDataFechamento(),
            saldoEmEspecie,
            valorFinal,
            caixa.getMotivoFechamento(),
            divergencia);
    }
}

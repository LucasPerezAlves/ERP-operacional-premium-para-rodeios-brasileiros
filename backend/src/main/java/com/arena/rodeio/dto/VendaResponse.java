package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.FormaPagamento;
import com.arena.rodeio.model.Venda;

public record VendaResponse(
    UUID id,
    UUID caixaId,
    BigDecimal valor,
    FormaPagamento formaPagamento,
    Instant registradaEm,
    /** Espécie no caixa após esta venda (só muda em vendas DINHEIRO). */
    BigDecimal saldoEmEspecie,
    /**
     * "ALERTA_SANGRIA_ATINGIDO" quando o dinheiro em caixa alcançou o
     * limiteSangria do operador (regra de negócio nº 2); null caso contrário.
     * O front-end usa este flag para alertar e acionar o supervisor.
     */
    String alerta
) {

    public static final String ALERTA_SANGRIA_ATINGIDO = "ALERTA_SANGRIA_ATINGIDO";

    public static VendaResponse from(Venda venda, BigDecimal saldoEmEspecie, String alerta) {
        return new VendaResponse(
            venda.getId(),
            venda.getCaixa().getId(),
            venda.getValor(),
            venda.getFormaPagamento(),
            venda.getRegistradaEm(),
            saldoEmEspecie,
            alerta);
    }
}

package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.FormaPagamento;
import com.arena.rodeio.model.NivelAlertaNumerario;
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
     * Nível de numerário em espécie (regra de negócio nº 2, revisada): nunca
     * bloqueia a venda, só escala o alerta para a gerência decidir a sangria.
     */
    NivelAlertaNumerario nivelAlerta
) {

    public static VendaResponse from(Venda venda, BigDecimal saldoEmEspecie, NivelAlertaNumerario nivelAlerta) {
        return new VendaResponse(
            venda.getId(),
            venda.getCaixa().getId(),
            venda.getValor(),
            venda.getFormaPagamento(),
            venda.getRegistradaEm(),
            saldoEmEspecie,
            nivelAlerta);
    }
}

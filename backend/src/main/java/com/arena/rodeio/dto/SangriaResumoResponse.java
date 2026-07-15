package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.Sangria;

/**
 * Versão enxuta de SangriaResponse para listagens (Activity Feed do Centro
 * de Operações): sem saldoEmEspecie, que exigiria recalcular o saldo
 * retroativo de cada caixa a cada sangria — caro e desnecessário aqui.
 */
public record SangriaResumoResponse(
    UUID id,
    UUID caixaId,
    UUID operadorId,
    BigDecimal valor,
    Instant registradaEm
) {

    public static SangriaResumoResponse from(Sangria sangria) {
        return new SangriaResumoResponse(
            sangria.getId(),
            sangria.getCaixa().getId(),
            sangria.getCaixa().getOperadorId(),
            sangria.getValor(),
            sangria.getRegistradaEm());
    }
}

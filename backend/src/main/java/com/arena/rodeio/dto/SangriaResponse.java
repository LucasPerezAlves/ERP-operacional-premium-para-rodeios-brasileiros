package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.Sangria;

public record SangriaResponse(
    UUID id,
    UUID caixaId,
    UUID adminId,
    BigDecimal valor,
    Instant registradaEm,
    /** Espécie restante no caixa após o recolhimento. */
    BigDecimal saldoEmEspecie
) {

    public static SangriaResponse from(Sangria sangria, BigDecimal saldoEmEspecie) {
        return new SangriaResponse(
            sangria.getId(),
            sangria.getCaixa().getId(),
            sangria.getAdminId(),
            sangria.getValor(),
            sangria.getRegistradaEm(),
            saldoEmEspecie);
    }
}

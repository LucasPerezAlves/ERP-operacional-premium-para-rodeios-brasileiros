package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.ConfiguracaoValorHora;

/** Um valor/hora vigente agora — global (areaTrabalho == null) ou de uma área específica. */
public record ValorVigenteResponse(
    String areaTrabalho,
    BigDecimal valorHora,
    Instant vigenciaInicio,
    UUID alteradoPorAdminId,
    String alteradoPorNome
) {

    public static ValorVigenteResponse from(ConfiguracaoValorHora config, String nomeAdmin) {
        return new ValorVigenteResponse(
            config.getAreaTrabalho(),
            config.getValorHora(),
            config.getVigenciaInicio(),
            config.getCriadoPorAdminId(),
            nomeAdmin);
    }
}

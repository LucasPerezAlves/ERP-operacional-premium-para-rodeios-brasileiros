package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.ConfiguracaoValorHora;
import com.arena.rodeio.model.EscopoValorHora;

/** Um registro do histórico completo (ativo ou encerrado) — alimenta a aba Histórico do modal. */
public record HistoricoValorHoraResponse(
    UUID id,
    EscopoValorHora escopo,
    String areaTrabalho,
    BigDecimal valorHora,
    Instant vigenciaInicio,
    Instant vigenciaFim,
    boolean ativo,
    UUID alteradoPorAdminId,
    String alteradoPorNome
) {

    public static HistoricoValorHoraResponse from(ConfiguracaoValorHora config, String nomeAdmin) {
        return new HistoricoValorHoraResponse(
            config.getId(),
            config.getEscopo(),
            config.getAreaTrabalho(),
            config.getValorHora(),
            config.getVigenciaInicio(),
            config.getVigenciaFim(),
            config.isAtivo(),
            config.getCriadoPorAdminId(),
            nomeAdmin);
    }
}

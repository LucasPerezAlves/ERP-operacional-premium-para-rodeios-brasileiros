package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.CategoriaSos;
import com.arena.rodeio.model.SosAlerta;
import com.arena.rodeio.model.StatusSos;

public record SosAlertaResponse(
    UUID id,
    UUID caixaId,
    UUID operadorId,
    String operadorNome,
    CategoriaSos categoria,
    BigDecimal saldoEmEspecie,
    StatusSos status,
    Instant criadoEm,
    UUID atendidoPorAdminId,
    Instant atendidoEm
) {

    public static SosAlertaResponse from(SosAlerta alerta) {
        return new SosAlertaResponse(
            alerta.getId(),
            alerta.getCaixa().getId(),
            alerta.getOperadorId(),
            alerta.getOperadorNome(),
            alerta.getCategoria(),
            alerta.getSaldoEmEspecie(),
            alerta.getStatus(),
            alerta.getCriadoEm(),
            alerta.getAtendidoPorAdminId(),
            alerta.getAtendidoEm());
    }
}

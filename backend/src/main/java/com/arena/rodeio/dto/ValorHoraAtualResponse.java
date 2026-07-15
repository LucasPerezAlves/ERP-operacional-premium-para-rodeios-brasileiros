package com.arena.rodeio.dto;

import java.util.List;

/** Estado efetivo atual: valor global (null se nunca configurado) + overrides ativos por área. */
public record ValorHoraAtualResponse(
    ValorVigenteResponse global,
    List<ValorVigenteResponse> overridesPorArea
) {}

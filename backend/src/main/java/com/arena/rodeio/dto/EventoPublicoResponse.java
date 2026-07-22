package com.arena.rodeio.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.arena.rodeio.model.Evento;

/**
 * DTO da Landing Page pública — deliberadamente menor que EventoResponse
 * (administrativo). Nunca expõe status, auditoria ou observações internas.
 */
public record EventoPublicoResponse(
    String slug,
    String nome,
    String descricaoCurta,
    String descricaoCompleta,
    String bannerUrl,
    String imagemDestaqueUrl,
    String cidade,
    String estado,
    String endereco,
    String local,
    LocalDate dataInicio,
    LocalDate dataFim,
    LocalTime horarioAbertura,
    Integer capacidade,
    String organizador
) {

    public static EventoPublicoResponse from(Evento evento) {
        return new EventoPublicoResponse(
            evento.getSlug(),
            evento.getNome(),
            evento.getDescricaoCurta(),
            evento.getDescricaoCompleta(),
            evento.getBannerUrl(),
            evento.getImagemDestaqueUrl(),
            evento.getCidade(),
            evento.getEstado(),
            evento.getEndereco(),
            evento.getLocal(),
            evento.getDataInicio(),
            evento.getDataFim(),
            evento.getHorarioAbertura(),
            evento.getCapacidade(),
            evento.getOrganizador());
    }
}

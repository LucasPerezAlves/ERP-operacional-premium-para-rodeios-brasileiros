package com.arena.rodeio.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import com.arena.rodeio.model.Evento;
import com.arena.rodeio.model.StatusEvento;

public record EventoResponse(
    UUID id,
    String nome,
    String slug,
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
    StatusEvento status,
    Integer capacidade,
    String organizador,
    String observacoes,
    UUID criadoPorAdminId,
    Instant publicadoEm,
    Instant encerradoEm,
    Instant criadoEm,
    Instant atualizadoEm
) {

    public static EventoResponse from(Evento evento) {
        return new EventoResponse(
            evento.getId(),
            evento.getNome(),
            evento.getSlug(),
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
            evento.getStatus(),
            evento.getCapacidade(),
            evento.getOrganizador(),
            evento.getObservacoes(),
            evento.getCriadoPorAdminId(),
            evento.getPublicadoEm(),
            evento.getEncerradoEm(),
            evento.getCriadoEm(),
            evento.getAtualizadoEm());
    }
}

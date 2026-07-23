package com.arena.rodeio.model;

/**
 * Ciclo de vida do Evento. Só PUBLICADO aparece na futura Landing Page
 * (Área Pública, spec futura) — os demais status são só do back-office.
 */
public enum StatusEvento {
    RASCUNHO,
    PUBLICADO,
    EM_ANDAMENTO,
    ENCERRADO,
    CANCELADO,
    ARQUIVADO
}

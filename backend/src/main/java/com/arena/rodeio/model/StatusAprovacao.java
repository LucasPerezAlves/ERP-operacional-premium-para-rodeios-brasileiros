package com.arena.rodeio.model;

/**
 * Fluxo de Aprovação de Gerência: todo cadastro nasce PENDENTE e só acessa
 * o sistema após a gerência aprovar.
 */
public enum StatusAprovacao {
    PENDENTE,
    APROVADO,
    REJEITADO
}

package com.arena.rodeio.model;

/**
 * DINHEIRO é a única forma que acumula espécie física no caixa e, portanto,
 * a única que participa do cálculo do alerta de sangria (regra de negócio nº 2).
 */
public enum FormaPagamento {
    DINHEIRO,
    DEBITO,
    CREDITO,
    PIX
}

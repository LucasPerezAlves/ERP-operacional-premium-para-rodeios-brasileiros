package com.arena.rodeio.model;

/**
 * Níveis de acesso (RBAC):
 * MASTER_ADMIN — exclusivo do proprietário: valores financeiros reais,
 *                fechamento global e relatórios.
 * OPERADOR     — apenas telas de lançamento da própria função; nunca vê
 *                totais de outros caixas.
 */
public enum PerfilAcesso {
    MASTER_ADMIN,
    OPERADOR
}

package com.arena.rodeio.model;

import java.math.BigDecimal;

/**
 * Nível de numerário em espécie no caixa (regra de negócio nº 2 — Segurança
 * Física). O sistema nunca bloqueia venda: apenas escala o alerta para a
 * gerência conforme o dinheiro acumula, e quem decide recolher é sempre a
 * gerência (regra inegociável nº 7 — sangria é exclusiva do MASTER_ADMIN).
 */
public enum NivelAlertaNumerario {
    NORMAL,
    ATENCAO,
    CRITICO;

    /** limiteAtencao e limiteCritico são configuráveis por operador (perfis_funcionarios). */
    public static NivelAlertaNumerario avaliar(
            BigDecimal saldoEmEspecie, BigDecimal limiteAtencao, BigDecimal limiteCritico) {
        if (saldoEmEspecie.compareTo(limiteCritico) >= 0) {
            return CRITICO;
        }
        if (saldoEmEspecie.compareTo(limiteAtencao) >= 0) {
            return ATENCAO;
        }
        return NORMAL;
    }
}

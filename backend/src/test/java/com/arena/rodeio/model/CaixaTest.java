package com.arena.rodeio.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class CaixaTest {

    @Test
    void fechar_gravaSnapshotDeJornadaQuandoValorHoraInformado() {
        var caixa = new Caixa(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("100.00"));

        caixa.fechar(new BigDecimal("150.00"), "Fim de turno",
            new BigDecimal("20.00"), new BigDecimal("190.00"));

        assertThat(caixa.getStatus()).isEqualTo(StatusCaixa.FECHADO);
        assertThat(caixa.getDataFechamento()).isNotNull();
        assertThat(caixa.getValorFinalConfirmado()).isEqualByComparingTo("150.00");
        assertThat(caixa.getValorHoraAplicado()).isEqualByComparingTo("20.00");
        assertThat(caixa.getValorTotalCalculado()).isEqualByComparingTo("190.00");
    }

    @Test
    void fechar_aceitaSnapshotNuloQuandoValorHoraNaoConfigurado() {
        var caixa = new Caixa(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("100.00"));

        caixa.fechar(new BigDecimal("150.00"), "Fim de turno", null, null);

        assertThat(caixa.getStatus()).isEqualTo(StatusCaixa.FECHADO);
        assertThat(caixa.getValorHoraAplicado()).isNull();
        assertThat(caixa.getValorTotalCalculado()).isNull();
    }
}

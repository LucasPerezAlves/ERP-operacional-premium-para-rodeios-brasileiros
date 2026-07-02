package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

/**
 * Payload de abertura de caixa (regra inegociável nº 7: só o MASTER_ADMIN
 * chama este endpoint, escolhendo PARA QUEM abre — nunca para si mesmo
 * implicitamente).
 */
public record AberturaCaixaRequest(

    @NotNull(message = "Selecione o operador que vai receber o caixa.")
    UUID operadorId,

    @NotNull(message = "Informe o saldo inicial do caixa (fundo de troco).")
    @DecimalMin(value = "0.00", message = "O saldo inicial não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal saldoInicial
) {}

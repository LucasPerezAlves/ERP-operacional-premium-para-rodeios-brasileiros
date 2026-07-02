package com.arena.rodeio.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Payload de fechamento de caixa (tela Gerenciamento de Equipe do Admin).
 * O valor contado fisicamente é obrigatório — é o que permite calcular
 * sobra/falta comparando com o saldo em espécie derivado dos lançamentos.
 */
public record FecharCaixaRequest(

    @NotNull(message = "Informe o valor em dinheiro confirmado na contagem.")
    @DecimalMin(value = "0.00", message = "O valor confirmado não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorFinalConfirmado,

    @NotBlank(message = "Informe o motivo do fechamento.")
    @Size(max = 500, message = "Motivo muito longo (máximo 500 caracteres).")
    String motivo
) {}

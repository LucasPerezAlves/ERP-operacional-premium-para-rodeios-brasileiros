package com.arena.rodeio.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Um item da lista de overrides por área do payload de salvar valores/hora. */
public record OverrideAreaValorHora(

    @NotBlank(message = "Informe a área de trabalho.")
    String area,

    @NotNull(message = "Informe o valor/hora da área.")
    @DecimalMin(value = "0.00", message = "O valor/hora não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorHora
) {}

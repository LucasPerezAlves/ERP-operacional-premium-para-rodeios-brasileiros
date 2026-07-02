package com.arena.rodeio.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record SangriaRequest(

    @NotNull(message = "Informe o valor recolhido na sangria.")
    @DecimalMin(value = "0.01", message = "O valor da sangria deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valor
) {}

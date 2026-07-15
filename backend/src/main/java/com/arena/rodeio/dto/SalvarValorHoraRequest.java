package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

/**
 * Payload único de salvamento: substitui o estado inteiro (valor global +
 * lista de overrides por área). O service faz o diff contra o estado ativo
 * atual e só versiona o que realmente mudou; uma área ausente da lista é
 * removida (volta a herdar o valor global).
 */
public record SalvarValorHoraRequest(

    @NotNull(message = "Informe o valor/hora padrão.")
    @DecimalMin(value = "0.00", message = "O valor/hora não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorHoraGlobal,

    @NotNull(message = "Informe a lista de overrides por área (pode ser vazia).")
    List<@Valid OverrideAreaValorHora> overrides
) {}

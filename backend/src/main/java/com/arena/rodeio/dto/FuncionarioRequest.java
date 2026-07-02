package com.arena.rodeio.dto;

import java.math.BigDecimal;

import com.arena.rodeio.model.CargoFuncionario;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Payload de criação/atualização de funcionário.
 * Record imutável; dinheiro sempre como BigDecimal.
 */
public record FuncionarioRequest(

    @NotBlank(message = "Informe o nome completo do funcionário.")
    String nomeCompleto,

    @NotBlank(message = "Informe o e-mail.")
    @Email(message = "E-mail inválido.")
    String email,

    @NotNull(message = "Informe o cargo.")
    CargoFuncionario cargo,

    @NotNull(message = "Informe o limite de sangria.")
    @DecimalMin(value = "0.00", message = "O limite de sangria não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal limiteSangria
) {}

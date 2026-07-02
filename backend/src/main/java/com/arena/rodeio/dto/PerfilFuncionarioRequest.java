package com.arena.rodeio.dto;

import java.math.BigDecimal;

import com.arena.rodeio.model.CargoFuncionario;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Payload de atualização do perfil (o perfil é CRIADO pela trigger do banco;
 * o e-mail pertence ao Supabase Auth e não é editável por aqui).
 * Record imutável; dinheiro sempre como BigDecimal.
 */
public record PerfilFuncionarioRequest(

    @NotBlank(message = "Informe o nome completo do funcionário.")
    String nomeCompleto,

    @NotNull(message = "Informe o cargo.")
    CargoFuncionario cargo,

    /** Posto do funcionário (ex.: "Bar de Fora"). Opcional — nem todo cargo tem um posto fixo. */
    String areaTrabalho,

    @NotNull(message = "Informe o limite de sangria.")
    @DecimalMin(value = "0.00", message = "O limite de sangria não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal limiteSangria
) {}

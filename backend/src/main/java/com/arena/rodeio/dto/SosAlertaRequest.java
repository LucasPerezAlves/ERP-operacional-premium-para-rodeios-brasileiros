package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.arena.rodeio.model.CategoriaSos;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SosAlertaRequest(

    @NotNull(message = "Informe o caixa que está acionando a gerência.")
    UUID caixaId,

    @NotBlank(message = "Informe o nome do operador.")
    @Size(max = 200, message = "Nome muito longo (máximo 200 caracteres).")
    String operadorNome,

    @NotNull(message = "Informe a categoria do SOS.")
    CategoriaSos categoria,

    @NotNull(message = "Informe o saldo em espécie no momento do acionamento.")
    @DecimalMin(value = "0.00", message = "O saldo em espécie não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal saldoEmEspecie
) {}

package com.arena.rodeio.dto;

import java.math.BigDecimal;

import com.arena.rodeio.model.FormaPagamento;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record VendaRequest(

    @NotNull(message = "Informe o valor da venda.")
    @DecimalMin(value = "0.01", message = "O valor da venda deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valor,

    @NotNull(message = "Informe a forma de pagamento (DINHEIRO, DEBITO, CREDITO ou PIX).")
    FormaPagamento formaPagamento
) {}

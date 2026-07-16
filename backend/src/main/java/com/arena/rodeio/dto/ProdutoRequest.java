package com.arena.rodeio.dto;

import java.math.BigDecimal;

import com.arena.rodeio.model.CategoriaProduto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Payload de cadastro/atualização (PUT substitui o registro inteiro, mesmo padrão de PerfilFuncionarioRequest). */
public record ProdutoRequest(

    @NotBlank(message = "Informe o nome do produto.")
    String nome,

    @NotNull(message = "Informe a categoria.")
    CategoriaProduto categoria,

    @NotNull(message = "Informe a quantidade em estoque.")
    @Min(value = 0, message = "A quantidade não pode ser negativa.")
    Integer quantidadeEstoque,

    @NotNull(message = "Informe o valor de venda.")
    @DecimalMin(value = "0.00", message = "O valor de venda não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorVenda,

    @NotNull(message = "Informe o valor de custo.")
    @DecimalMin(value = "0.00", message = "O valor de custo não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorCusto
) {}

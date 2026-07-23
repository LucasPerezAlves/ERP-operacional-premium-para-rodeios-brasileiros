package com.arena.rodeio.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Payload de cadastro/atualização (PUT substitui o registro inteiro, mesmo
 * padrão de ProdutoRequest). Sem slug (gerado pelo backend) e sem status
 * (só muda pelos endpoints de transição — publicar/despublicar/etc).
 */
public record EventoRequest(

    @NotBlank(message = "Informe o nome do evento.")
    String nome,

    @Size(max = 300, message = "A descrição curta deve ter no máximo 300 caracteres.")
    String descricaoCurta,

    String descricaoCompleta,

    String bannerUrl,

    String imagemDestaqueUrl,

    String cidade,

    @Pattern(regexp = "^[A-Za-z]{2}$", message = "Informe a UF com 2 letras (ex.: RS).")
    String estado,

    String endereco,

    String local,

    @NotNull(message = "Informe a data de início.")
    LocalDate dataInicio,

    @NotNull(message = "Informe a data de término.")
    LocalDate dataFim,

    LocalTime horarioAbertura,

    @Min(value = 1, message = "A capacidade deve ser maior que zero.")
    Integer capacidade,

    String organizador,

    String observacoes
) {}

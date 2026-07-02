package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.CargoFuncionario;
import com.arena.rodeio.model.Funcionario;

public record FuncionarioResponse(
    UUID id,
    UUID authUserId,
    String nomeCompleto,
    String email,
    CargoFuncionario cargo,
    BigDecimal limiteSangria,
    boolean ativo,
    Instant criadoEm,
    Instant atualizadoEm
) {

    public static FuncionarioResponse from(Funcionario funcionario) {
        return new FuncionarioResponse(
            funcionario.getId(),
            funcionario.getAuthUserId(),
            funcionario.getNomeCompleto(),
            funcionario.getEmail(),
            funcionario.getCargo(),
            funcionario.getLimiteSangria(),
            funcionario.isAtivo(),
            funcionario.getCriadoEm(),
            funcionario.getAtualizadoEm());
    }
}

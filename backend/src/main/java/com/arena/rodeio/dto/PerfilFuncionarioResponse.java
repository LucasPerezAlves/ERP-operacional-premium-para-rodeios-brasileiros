package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.CargoFuncionario;
import com.arena.rodeio.model.PerfilAcesso;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.model.StatusAprovacao;

public record PerfilFuncionarioResponse(
    UUID id,
    String nomeCompleto,
    String email,
    CargoFuncionario cargo,
    StatusAprovacao statusAprovacao,
    PerfilAcesso perfilAcesso,
    BigDecimal limiteSangria,
    boolean ativo,
    Instant criadoEm,
    Instant atualizadoEm
) {

    public static PerfilFuncionarioResponse from(PerfilFuncionario perfil) {
        return new PerfilFuncionarioResponse(
            perfil.getId(),
            perfil.getNomeCompleto(),
            perfil.getEmail(),
            perfil.getCargo(),
            perfil.getStatusAprovacao(),
            perfil.getPerfilAcesso(),
            perfil.getLimiteSangria(),
            perfil.isAtivo(),
            perfil.getCriadoEm(),
            perfil.getAtualizadoEm());
    }
}

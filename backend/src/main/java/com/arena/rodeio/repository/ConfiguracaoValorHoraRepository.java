package com.arena.rodeio.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.ConfiguracaoValorHora;
import com.arena.rodeio.model.EscopoValorHora;

public interface ConfiguracaoValorHoraRepository extends JpaRepository<ConfiguracaoValorHora, UUID> {

    /** GLOBAL: 0 ou 1 elemento. AREA: 0 a N (um por área com override ativo). */
    List<ConfiguracaoValorHora> findByEscopoAndAtivoTrue(EscopoValorHora escopo);

    Optional<ConfiguracaoValorHora> findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora escopo, String areaTrabalho);

    /** Histórico completo (ativos e encerrados), mais recente primeiro. */
    List<ConfiguracaoValorHora> findAllByOrderByVigenciaInicioDesc();
}

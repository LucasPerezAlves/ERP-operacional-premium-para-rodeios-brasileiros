package com.arena.rodeio.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.SosAlerta;
import com.arena.rodeio.model.StatusSos;

public interface SosAlertaRepository extends JpaRepository<SosAlerta, UUID> {

    /** Painel do Admin — histórico ainda não atendido, mais recente primeiro. */
    List<SosAlerta> findByStatusOrderByCriadoEmDesc(StatusSos status);
}

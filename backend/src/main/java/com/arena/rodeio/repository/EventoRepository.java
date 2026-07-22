package com.arena.rodeio.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.Evento;

public interface EventoRepository extends JpaRepository<Evento, UUID> {

    boolean existsBySlug(String slug);

    List<Evento> findAllByOrderByDataInicioDesc();
}

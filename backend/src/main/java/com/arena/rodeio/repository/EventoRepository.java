package com.arena.rodeio.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.Evento;
import com.arena.rodeio.model.StatusEvento;

public interface EventoRepository extends JpaRepository<Evento, UUID> {

    boolean existsBySlug(String slug);

    List<Evento> findAllByOrderByDataInicioDesc();

    List<Evento> findByStatusOrderByDataInicioAsc(StatusEvento status);

    Optional<Evento> findBySlugAndStatus(String slug, StatusEvento status);
}

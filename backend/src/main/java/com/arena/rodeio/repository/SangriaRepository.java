package com.arena.rodeio.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.arena.rodeio.model.Sangria;

public interface SangriaRepository extends JpaRepository<Sangria, UUID> {

    @Query("""
        select coalesce(sum(s.valor), 0)
        from Sangria s
        where s.caixa.id = :caixaId
        """)
    BigDecimal somarPorCaixa(@Param("caixaId") UUID caixaId);

    /** Mais recente primeiro — alimenta o Activity Feed do Centro de Operações. */
    List<Sangria> findAllByOrderByRegistradaEmDesc();
}

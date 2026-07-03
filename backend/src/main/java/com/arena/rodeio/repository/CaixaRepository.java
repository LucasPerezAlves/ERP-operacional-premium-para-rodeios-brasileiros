package com.arena.rodeio.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.Caixa;
import com.arena.rodeio.model.StatusCaixa;

public interface CaixaRepository extends JpaRepository<Caixa, UUID> {

    boolean existsByOperadorIdAndStatus(UUID operadorId, StatusCaixa status);

    Optional<Caixa> findByOperadorIdAndStatus(UUID operadorId, StatusCaixa status);

    /** Usado pela tela Gerenciamento de Equipe do Admin (status de todo mundo). */
    List<Caixa> findByStatus(StatusCaixa status);

    /** Usado pelo Scorecard de Divergência (Master Admin backlog, item 3). */
    List<Caixa> findByStatusOrderByDataFechamentoDesc(StatusCaixa status);
}

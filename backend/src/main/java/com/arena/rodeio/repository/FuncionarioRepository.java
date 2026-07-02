package com.arena.rodeio.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.Funcionario;

public interface FuncionarioRepository extends JpaRepository<Funcionario, UUID> {

    Optional<Funcionario> findByAuthUserId(UUID authUserId);

    Optional<Funcionario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);
}

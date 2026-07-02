package com.arena.rodeio.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.PerfilFuncionario;

public interface PerfilFuncionarioRepository extends JpaRepository<PerfilFuncionario, UUID> {

    Optional<PerfilFuncionario> findByEmailIgnoreCase(String email);
}

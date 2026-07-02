package com.arena.rodeio.service;

import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.FuncionarioRequest;
import com.arena.rodeio.dto.FuncionarioResponse;
import com.arena.rodeio.model.Funcionario;
import com.arena.rodeio.repository.FuncionarioRepository;

@Service
public class FuncionarioService {

    private final FuncionarioRepository repository;

    public FuncionarioService(FuncionarioRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<FuncionarioResponse> listar() {
        return repository.findAll().stream()
            .map(FuncionarioResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public FuncionarioResponse buscarPorId(UUID id) {
        return FuncionarioResponse.from(buscarEntidade(id));
    }

    /** Perfil do próprio usuário autenticado, resolvido pelo "sub" do JWT. */
    @Transactional(readOnly = true)
    public FuncionarioResponse buscarPorAuthUserId(UUID authUserId) {
        return repository.findByAuthUserId(authUserId)
            .map(FuncionarioResponse::from)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Nenhum funcionário vinculado a este usuário. Contate o administrador."));
    }

    @Transactional
    public FuncionarioResponse criar(FuncionarioRequest request) {
        if (repository.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Já existe um funcionário com este e-mail.");
        }

        var funcionario = new Funcionario(
            request.nomeCompleto().trim(),
            request.email().trim().toLowerCase(),
            request.cargo(),
            // Dinheiro sempre com scale 2 e arredondamento bancário
            request.limiteSangria().setScale(2, RoundingMode.HALF_EVEN));

        return FuncionarioResponse.from(repository.save(funcionario));
    }

    @Transactional
    public FuncionarioResponse atualizar(UUID id, FuncionarioRequest request) {
        var funcionario = buscarEntidade(id);

        repository.findByEmailIgnoreCase(request.email())
            .filter(existente -> !existente.getId().equals(id))
            .ifPresent(existente -> {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Já existe outro funcionário com este e-mail.");
            });

        funcionario.setNomeCompleto(request.nomeCompleto().trim());
        funcionario.setEmail(request.email().trim().toLowerCase());
        funcionario.setCargo(request.cargo());
        funcionario.setLimiteSangria(
            request.limiteSangria().setScale(2, RoundingMode.HALF_EVEN));

        return FuncionarioResponse.from(funcionario);
    }

    /** Desativação lógica: histórico financeiro do operador nunca é apagado. */
    @Transactional
    public FuncionarioResponse desativar(UUID id) {
        var funcionario = buscarEntidade(id);
        funcionario.setAtivo(false);
        return FuncionarioResponse.from(funcionario);
    }

    private Funcionario buscarEntidade(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Funcionário não encontrado."));
    }
}

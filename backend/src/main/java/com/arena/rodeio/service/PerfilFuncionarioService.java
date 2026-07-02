package com.arena.rodeio.service;

import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.PerfilFuncionarioRequest;
import com.arena.rodeio.dto.PerfilFuncionarioResponse;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.model.StatusAprovacao;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;

@Service
public class PerfilFuncionarioService {

    private final PerfilFuncionarioRepository repository;

    public PerfilFuncionarioService(PerfilFuncionarioRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PerfilFuncionarioResponse> listar() {
        return repository.findAll().stream()
            .map(PerfilFuncionarioResponse::from)
            .toList();
    }

    /** O id do perfil É o id do usuário no Supabase (claim "sub" do JWT). */
    @Transactional(readOnly = true)
    public PerfilFuncionarioResponse buscarPorId(UUID id) {
        return PerfilFuncionarioResponse.from(buscarEntidade(id));
    }

    @Transactional
    public PerfilFuncionarioResponse atualizar(UUID id, PerfilFuncionarioRequest request) {
        var perfil = buscarEntidade(id);

        perfil.setNomeCompleto(request.nomeCompleto().trim());
        perfil.setCargo(request.cargo());
        perfil.setAreaTrabalho(request.areaTrabalho() == null ? null : request.areaTrabalho().trim());
        perfil.setLimiteSangria(
            // Dinheiro sempre com scale 2 e arredondamento bancário
            request.limiteSangria().setScale(2, RoundingMode.HALF_EVEN));

        return PerfilFuncionarioResponse.from(perfil);
    }

    /**
     * Aprovação de Gerência: chamada pelo link "Aprovar Peão" do e-mail.
     * Idempotente — clicar duas vezes no link não causa erro.
     */
    @Transactional
    public PerfilFuncionarioResponse aprovar(UUID id) {
        var perfil = buscarEntidade(id);
        perfil.setStatusAprovacao(StatusAprovacao.APROVADO);
        return PerfilFuncionarioResponse.from(perfil);
    }

    /** Desativação lógica: histórico financeiro do operador nunca é apagado. */
    @Transactional
    public PerfilFuncionarioResponse desativar(UUID id) {
        var perfil = buscarEntidade(id);
        perfil.setAtivo(false);
        return PerfilFuncionarioResponse.from(perfil);
    }

    private PerfilFuncionario buscarEntidade(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Funcionário não encontrado."));
    }
}

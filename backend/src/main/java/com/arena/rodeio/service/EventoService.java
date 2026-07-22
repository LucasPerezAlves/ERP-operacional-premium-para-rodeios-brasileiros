package com.arena.rodeio.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.EventoRequest;
import com.arena.rodeio.dto.EventoResponse;
import com.arena.rodeio.model.Evento;
import com.arena.rodeio.model.StatusEvento;
import com.arena.rodeio.repository.EventoRepository;

/**
 * Sprint 1: domínio do Evento isolado — nenhum outro módulo (Caixa,
 * PerfilFuncionario, Catálogo) referencia Evento ainda (ver CLAUDE.md §
 * Entidade Central: Evento). CRUD administrativo + state machine de status;
 * a Landing Page (consumo público) é uma spec futura.
 */
@Service
public class EventoService {

    private final EventoRepository repository;

    public EventoService(EventoRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public EventoResponse cadastrar(UUID adminId, EventoRequest request) {
        validarDatas(request);

        var evento = new Evento(
            request.nome().trim(),
            gerarSlugUnico(request.nome()),
            adminId,
            request.dataInicio(),
            request.dataFim());
        aplicarCamposOpcionais(evento, request);

        return EventoResponse.from(repository.save(evento));
    }

    @Transactional(readOnly = true)
    public List<EventoResponse> listarTodos() {
        return repository.findAllByOrderByDataInicioDesc().stream()
            .map(EventoResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public EventoResponse buscar(UUID id) {
        return EventoResponse.from(buscarEntidade(id));
    }

    /** PUT substitui o registro inteiro. O slug nunca é regerado — é o permalink estável do evento. */
    @Transactional
    public EventoResponse atualizar(UUID id, EventoRequest request) {
        validarDatas(request);

        var evento = buscarEntidade(id);
        evento.setNome(request.nome().trim());
        evento.setDataInicio(request.dataInicio());
        evento.setDataFim(request.dataFim());
        aplicarCamposOpcionais(evento, request);

        return EventoResponse.from(evento);
    }

    @Transactional
    public EventoResponse publicar(UUID id) {
        var evento = buscarEntidade(id);
        exigirStatusAtual(evento, "publicar", StatusEvento.RASCUNHO);
        evento.publicar();
        return EventoResponse.from(evento);
    }

    @Transactional
    public EventoResponse despublicar(UUID id) {
        var evento = buscarEntidade(id);
        exigirStatusAtual(evento, "despublicar", StatusEvento.PUBLICADO);
        evento.despublicar();
        return EventoResponse.from(evento);
    }

    @Transactional
    public EventoResponse iniciar(UUID id) {
        var evento = buscarEntidade(id);
        exigirStatusAtual(evento, "iniciar", StatusEvento.PUBLICADO);
        evento.iniciar();
        return EventoResponse.from(evento);
    }

    @Transactional
    public EventoResponse encerrar(UUID id) {
        var evento = buscarEntidade(id);
        exigirStatusAtual(evento, "encerrar", StatusEvento.EM_ANDAMENTO);
        evento.encerrar();
        return EventoResponse.from(evento);
    }

    @Transactional
    public EventoResponse cancelar(UUID id) {
        var evento = buscarEntidade(id);
        exigirStatusAtual(evento, "cancelar", StatusEvento.RASCUNHO, StatusEvento.PUBLICADO, StatusEvento.EM_ANDAMENTO);
        evento.cancelar();
        return EventoResponse.from(evento);
    }

    @Transactional
    public EventoResponse arquivar(UUID id) {
        var evento = buscarEntidade(id);
        exigirStatusAtual(evento, "arquivar", StatusEvento.ENCERRADO, StatusEvento.CANCELADO);
        evento.arquivar();
        return EventoResponse.from(evento);
    }

    private void aplicarCamposOpcionais(Evento evento, EventoRequest request) {
        evento.setDescricaoCurta(request.descricaoCurta());
        evento.setDescricaoCompleta(request.descricaoCompleta());
        evento.setBannerUrl(request.bannerUrl());
        evento.setImagemDestaqueUrl(request.imagemDestaqueUrl());
        evento.setCidade(request.cidade());
        evento.setEstado(request.estado() == null ? null : request.estado().toUpperCase(Locale.ROOT));
        evento.setEndereco(request.endereco());
        evento.setLocal(request.local());
        evento.setHorarioAbertura(request.horarioAbertura());
        evento.setCapacidade(request.capacidade());
        evento.setOrganizador(request.organizador());
        evento.setObservacoes(request.observacoes());
    }

    private void validarDatas(EventoRequest request) {
        if (request.dataFim().isBefore(request.dataInicio())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "A data de término não pode ser anterior à data de início.");
        }
    }

    private void exigirStatusAtual(Evento evento, String acao, StatusEvento... permitidos) {
        for (var permitido : permitidos) {
            if (evento.getStatus() == permitido) return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Não é possível %s um evento no status %s.".formatted(acao, evento.getStatus()));
    }

    private Evento buscarEntidade(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Evento não encontrado."));
    }

    /** Normaliza acento/caixa, troca não-alfanumérico por hífen, e desempata contra slugs já existentes. */
    private String gerarSlugUnico(String nome) {
        var base = slugificar(nome);
        var candidato = base;
        var sufixo = 2;
        while (repository.existsBySlug(candidato)) {
            candidato = base + "-" + sufixo;
            sufixo++;
        }
        return candidato;
    }

    private String slugificar(String texto) {
        var semAcentos = Normalizer.normalize(texto, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        var slug = semAcentos.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");
        return slug.isEmpty() ? "evento" : slug;
    }
}

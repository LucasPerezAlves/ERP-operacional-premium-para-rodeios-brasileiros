package com.arena.rodeio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.EventoRequest;
import com.arena.rodeio.model.Evento;
import com.arena.rodeio.model.StatusEvento;
import com.arena.rodeio.repository.EventoRepository;

@ExtendWith(MockitoExtension.class)
class EventoServiceTest {

    @Mock private EventoRepository repository;

    private EventoService service;

    @BeforeEach
    void setUp() {
        service = new EventoService(repository);
    }

    private EventoRequest requestValido(String nome) {
        return new EventoRequest(
            nome, null, null, null, null, null, null, null, null,
            LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
            null, null, null, null);
    }

    @Test
    void cadastrar_geraSlugAPartirDoNome() {
        when(repository.existsBySlug(anyString())).thenReturn(false);
        when(repository.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));

        var evento = service.cadastrar(UUID.randomUUID(), requestValido("Rodeio de Outono"));

        assertThat(evento.slug()).isEqualTo("rodeio-de-outono");
    }

    @Test
    void cadastrar_desempataSlugComSufixoQuandoJaExiste() {
        when(repository.existsBySlug("rodeio-de-outono")).thenReturn(true);
        when(repository.existsBySlug("rodeio-de-outono-2")).thenReturn(false);
        when(repository.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));

        var evento = service.cadastrar(UUID.randomUUID(), requestValido("Rodeio de Outono"));

        assertThat(evento.slug()).isEqualTo("rodeio-de-outono-2");
    }

    @Test
    void cadastrar_rejeitaDataFimAnteriorAoInicio() {
        var request = new EventoRequest(
            "Rodeio Inválido", null, null, null, null, null, null, null, null,
            LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 10),
            null, null, null, null);

        assertThatThrownBy(() -> service.cadastrar(UUID.randomUUID(), request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("data de término");
    }

    @Test
    void publicar_permiteAPartirDeRascunho() {
        var evento = criarEntidade();
        when(repository.findById(any())).thenReturn(Optional.of(evento));

        var resposta = service.publicar(UUID.randomUUID());

        assertThat(resposta.status().name()).isEqualTo("PUBLICADO");
        assertThat(resposta.publicadoEm()).isNotNull();
    }

    @Test
    void publicar_rejeitaSeJaPublicado() {
        var evento = criarEntidade();
        evento.publicar();
        when(repository.findById(any())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> service.publicar(UUID.randomUUID()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("publicar");
    }

    @Test
    void arquivar_permiteAPartirDeEncerrado() {
        var evento = criarEntidade();
        evento.publicar();
        evento.iniciar();
        evento.encerrar();
        when(repository.findById(any())).thenReturn(Optional.of(evento));

        var resposta = service.arquivar(UUID.randomUUID());

        assertThat(resposta.status().name()).isEqualTo("ARQUIVADO");
    }

    @Test
    void arquivar_rejeitaAPartirDeRascunho() {
        var evento = criarEntidade();
        when(repository.findById(any())).thenReturn(Optional.of(evento));

        assertThatThrownBy(() -> service.arquivar(UUID.randomUUID()))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("arquivar");
    }

    @Test
    void listarPublicos_retornaSoEventosPublicados() {
        var publicado = criarEntidade();
        publicado.publicar();
        when(repository.findByStatusOrderByDataInicioAsc(StatusEvento.PUBLICADO))
            .thenReturn(java.util.List.of(publicado));

        var resultado = service.listarPublicos();

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).slug()).isEqualTo("rodeio-de-teste");
        assertThat(resultado.get(0).nome()).isEqualTo("Rodeio de Teste");
    }

    @Test
    void buscarPublicoPorSlug_retornaQuandoPublicado() {
        var publicado = criarEntidade();
        publicado.publicar();
        when(repository.findBySlugAndStatus("rodeio-de-teste", StatusEvento.PUBLICADO))
            .thenReturn(Optional.of(publicado));

        var resultado = service.buscarPublicoPorSlug("rodeio-de-teste");

        assertThat(resultado.nome()).isEqualTo("Rodeio de Teste");
    }

    @Test
    void buscarPublicoPorSlug_lanca404QuandoNaoPublicado() {
        when(repository.findBySlugAndStatus("inexistente", StatusEvento.PUBLICADO))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buscarPublicoPorSlug("inexistente"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("não encontrado");
    }

    private Evento criarEntidade() {
        return new Evento(
            "Rodeio de Teste", "rodeio-de-teste", UUID.randomUUID(),
            LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12));
    }
}

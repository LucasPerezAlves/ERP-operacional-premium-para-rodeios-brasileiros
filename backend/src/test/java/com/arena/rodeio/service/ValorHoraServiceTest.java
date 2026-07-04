package com.arena.rodeio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.arena.rodeio.dto.OverrideAreaValorHora;
import com.arena.rodeio.dto.SalvarValorHoraRequest;
import com.arena.rodeio.model.ConfiguracaoValorHora;
import com.arena.rodeio.model.EscopoValorHora;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.repository.ConfiguracaoValorHoraRepository;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;

@ExtendWith(MockitoExtension.class)
class ValorHoraServiceTest {

    @Mock
    private ConfiguracaoValorHoraRepository repository;

    @Mock
    private PerfilFuncionarioRepository perfilFuncionarioRepository;

    private ValorHoraService service;

    private final UUID adminId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new ValorHoraService(repository, perfilFuncionarioRepository);
    }

    @Test
    void salvar_criaPrimeiroValorGlobalQuandoNaoHaConfiguracaoAtiva() {
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of());
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of());

        var request = new SalvarValorHoraRequest(new BigDecimal("20.00"), List.of());
        service.salvar(adminId, request);

        var captor = ArgumentCaptor.forClass(ConfiguracaoValorHora.class);
        verify(repository).save(captor.capture());
        var salvo = captor.getValue();
        assertThat(salvo.getEscopo()).isEqualTo(EscopoValorHora.GLOBAL);
        assertThat(salvo.getAreaTrabalho()).isNull();
        assertThat(salvo.getValorHora()).isEqualByComparingTo("20.00");
        assertThat(salvo.getCriadoPorAdminId()).isEqualTo(adminId);
    }

    @Test
    void salvar_versionaQuandoValorGlobalMuda() {
        var antigo = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("15.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(antigo));
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of());

        var request = new SalvarValorHoraRequest(new BigDecimal("20.00"), List.of());
        service.salvar(adminId, request);

        assertThat(antigo.isAtivo()).isFalse();
        assertThat(antigo.getVigenciaFim()).isNotNull();
        verify(repository).save(any(ConfiguracaoValorHora.class));
    }

    @Test
    void salvar_naoVersionaQuandoValorGlobalNaoMuda() {
        var atual = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("20.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(atual));
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of());

        var request = new SalvarValorHoraRequest(new BigDecimal("20.00"), List.of());
        service.salvar(adminId, request);

        assertThat(atual.isAtivo()).isTrue();
        verify(repository, never()).save(any());
    }

    @Test
    void salvar_criaOverridePorAreaERemoveOsQueSairamDaLista() {
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of());

        var overrideAntigoPortaria =
            new ConfiguracaoValorHora(EscopoValorHora.AREA, "Portaria", new BigDecimal("25.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of(overrideAntigoPortaria));
        when(repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, "Bar de Fora"))
            .thenReturn(Optional.empty());

        var request = new SalvarValorHoraRequest(
            new BigDecimal("20.00"),
            List.of(new OverrideAreaValorHora("Bar de Fora", new BigDecimal("15.00"))));
        service.salvar(adminId, request);

        assertThat(overrideAntigoPortaria.isAtivo()).isFalse();

        var captor = ArgumentCaptor.forClass(ConfiguracaoValorHora.class);
        verify(repository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues())
            .anyMatch(c -> c.getEscopo() == EscopoValorHora.AREA
                && "Bar de Fora".equals(c.getAreaTrabalho())
                && c.getValorHora().compareTo(new BigDecimal("15.00")) == 0);
    }

    @Test
    void buscarAtual_retornaGlobalEOverridesComNomeDoAdmin() {
        var admin = mock(PerfilFuncionario.class);
        when(admin.getNomeCompleto()).thenReturn("Admin Teste");
        when(perfilFuncionarioRepository.findById(adminId)).thenReturn(Optional.of(admin));

        var global = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("20.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(global));
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of());

        var resposta = service.buscarAtual();

        assertThat(resposta.global()).isNotNull();
        assertThat(resposta.global().valorHora()).isEqualByComparingTo("20.00");
        assertThat(resposta.global().alteradoPorNome()).isEqualTo("Admin Teste");
        assertThat(resposta.overridesPorArea()).isEmpty();
    }

    @Test
    void resolverValorHoraEfetivoAgora_usaOverrideDaAreaQuandoExiste() {
        var overridePortaria = new ConfiguracaoValorHora(EscopoValorHora.AREA, "Portaria", new BigDecimal("25.00"), adminId);
        when(repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, "Portaria"))
            .thenReturn(Optional.of(overridePortaria));

        var resultado = service.resolverValorHoraEfetivoAgora("Portaria");

        assertThat(resultado).isPresent();
        assertThat(resultado.get()).isEqualByComparingTo("25.00");
    }

    @Test
    void resolverValorHoraEfetivoAgora_caiParaGlobalQuandoAreaNaoTemOverride() {
        when(repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, "Bar de Fora"))
            .thenReturn(Optional.empty());
        var global = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("18.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(global));

        var resultado = service.resolverValorHoraEfetivoAgora("Bar de Fora");

        assertThat(resultado).isPresent();
        assertThat(resultado.get()).isEqualByComparingTo("18.00");
    }

    @Test
    void resolverValorHoraEfetivoAgora_retornaVazioQuandoNadaConfigurado() {
        when(repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, "Estacionamento"))
            .thenReturn(Optional.empty());
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of());

        var resultado = service.resolverValorHoraEfetivoAgora("Estacionamento");

        assertThat(resultado).isEmpty();
    }

    @Test
    void resolverValorHoraEfetivoAgora_usaGlobalDiretoQuandoAreaTrabalhoNula() {
        var global = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("18.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(global));

        var resultado = service.resolverValorHoraEfetivoAgora(null);

        assertThat(resultado).isPresent();
        assertThat(resultado.get()).isEqualByComparingTo("18.00");
    }
}

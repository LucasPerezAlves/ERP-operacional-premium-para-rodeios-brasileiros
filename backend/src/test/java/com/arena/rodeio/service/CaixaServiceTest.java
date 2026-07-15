package com.arena.rodeio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.arena.rodeio.dto.FecharCaixaRequest;
import com.arena.rodeio.model.Caixa;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.model.Sangria;
import com.arena.rodeio.repository.CaixaRepository;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;
import com.arena.rodeio.repository.SangriaRepository;
import com.arena.rodeio.repository.VendaRepository;

@ExtendWith(MockitoExtension.class)
class CaixaServiceTest {

    @Mock private CaixaRepository caixaRepository;
    @Mock private VendaRepository vendaRepository;
    @Mock private SangriaRepository sangriaRepository;
    @Mock private PerfilFuncionarioRepository perfilFuncionarioRepository;
    @Mock private ValorHoraService valorHoraService;

    private CaixaService service;

    @BeforeEach
    void setUp() {
        service = new CaixaService(
            caixaRepository, vendaRepository, sangriaRepository, perfilFuncionarioRepository, valorHoraService);
    }

    @Test
    void fechar_calculaMinutosEValorTotalQuandoValorHoraConfigurado() {
        var operadorId = UUID.randomUUID();
        var caixa = mock(Caixa.class);
        when(caixa.getId()).thenReturn(UUID.randomUUID());
        when(caixa.getOperadorId()).thenReturn(operadorId);
        when(caixa.estaAberto()).thenReturn(true);
        when(caixa.getSaldoInicial()).thenReturn(new BigDecimal("100.00"));
        when(caixa.getDataAbertura()).thenReturn(Instant.now().minus(570, ChronoUnit.MINUTES));
        when(caixaRepository.findById(any())).thenReturn(Optional.of(caixa));
        when(vendaRepository.somarPorCaixaEFormaPagamento(any(), any())).thenReturn(BigDecimal.ZERO);
        when(sangriaRepository.somarPorCaixa(any())).thenReturn(BigDecimal.ZERO);

        var perfil = mock(PerfilFuncionario.class);
        when(perfil.getAreaTrabalho()).thenReturn("Portaria");
        // avaliarNivelAlerta() compara saldoEmEspecie com estes limiares via
        // BigDecimal.compareTo — sem stub, o mock devolve null e explode com
        // NullPointerException. Valores altos aqui só para não disparar
        // ATENCAO/CRITICO (irrelevante para o que este teste verifica).
        when(perfil.getLimiteAtencao()).thenReturn(new BigDecimal("500.00"));
        when(perfil.getLimiteCritico()).thenReturn(new BigDecimal("1000.00"));
        when(perfilFuncionarioRepository.findById(operadorId)).thenReturn(Optional.of(perfil));
        when(valorHoraService.resolverValorHoraEfetivoAgora("Portaria"))
            .thenReturn(Optional.of(new BigDecimal("20.00")));

        service.fechar(caixa.getId(), new FecharCaixaRequest(new BigDecimal("150.00"), "Fim de turno"));

        // Verifica a chamada a fechar(...) com os 4 argumentos: 570 minutos
        // (9h30) × R$20,00/h = R$190,00.
        org.mockito.Mockito.verify(caixa).fechar(
            org.mockito.ArgumentMatchers.eq(new BigDecimal("150.00")),
            org.mockito.ArgumentMatchers.eq("Fim de turno"),
            org.mockito.ArgumentMatchers.argThat(valor -> valor != null && valor.compareTo(new BigDecimal("20.00")) == 0),
            org.mockito.ArgumentMatchers.argThat(valor -> valor != null && valor.compareTo(new BigDecimal("190.00")) == 0));
    }

    @Test
    void fechar_gravaSnapshotNuloQuandoValorHoraNaoConfigurado() {
        var operadorId = UUID.randomUUID();
        var caixa = mock(Caixa.class);
        when(caixa.getId()).thenReturn(UUID.randomUUID());
        when(caixa.getOperadorId()).thenReturn(operadorId);
        when(caixa.estaAberto()).thenReturn(true);
        when(caixa.getSaldoInicial()).thenReturn(new BigDecimal("100.00"));
        when(caixa.getDataAbertura()).thenReturn(Instant.now().minus(60, ChronoUnit.MINUTES));
        when(caixaRepository.findById(any())).thenReturn(Optional.of(caixa));
        when(vendaRepository.somarPorCaixaEFormaPagamento(any(), any())).thenReturn(BigDecimal.ZERO);
        when(sangriaRepository.somarPorCaixa(any())).thenReturn(BigDecimal.ZERO);

        var perfil = mock(PerfilFuncionario.class);
        when(perfil.getAreaTrabalho()).thenReturn("Portaria");
        when(perfil.getLimiteAtencao()).thenReturn(new BigDecimal("500.00"));
        when(perfil.getLimiteCritico()).thenReturn(new BigDecimal("1000.00"));
        when(perfilFuncionarioRepository.findById(operadorId)).thenReturn(Optional.of(perfil));
        when(valorHoraService.resolverValorHoraEfetivoAgora("Portaria")).thenReturn(Optional.empty());

        service.fechar(caixa.getId(), new FecharCaixaRequest(new BigDecimal("150.00"), "Fim de turno"));

        org.mockito.Mockito.verify(caixa).fechar(
            org.mockito.ArgumentMatchers.eq(new BigDecimal("150.00")),
            org.mockito.ArgumentMatchers.eq("Fim de turno"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.isNull());
    }

    @Test
    void listarTodasSangrias_retornaResumoComOperadorIdDoCaixa() {
        var operadorId = UUID.randomUUID();
        var caixaId = UUID.randomUUID();
        var sangriaId = UUID.randomUUID();
        var agora = Instant.now();

        var caixa = mock(Caixa.class);
        when(caixa.getId()).thenReturn(caixaId);
        when(caixa.getOperadorId()).thenReturn(operadorId);

        var sangria = mock(Sangria.class);
        when(sangria.getId()).thenReturn(sangriaId);
        when(sangria.getCaixa()).thenReturn(caixa);
        when(sangria.getValor()).thenReturn(new BigDecimal("50.00"));
        when(sangria.getRegistradaEm()).thenReturn(agora);

        when(sangriaRepository.findAllByOrderByRegistradaEmDesc()).thenReturn(List.of(sangria));

        var resultado = service.listarTodasSangrias();

        assertThat(resultado).hasSize(1);
        var resumo = resultado.get(0);
        assertThat(resumo.id()).isEqualTo(sangriaId);
        assertThat(resumo.caixaId()).isEqualTo(caixaId);
        assertThat(resumo.operadorId()).isEqualTo(operadorId);
        assertThat(resumo.valor()).isEqualByComparingTo("50.00");
        assertThat(resumo.registradaEm()).isEqualTo(agora);
    }
}

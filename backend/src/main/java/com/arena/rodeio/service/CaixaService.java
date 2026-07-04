package com.arena.rodeio.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.AberturaCaixaRequest;
import com.arena.rodeio.dto.CaixaResponse;
import com.arena.rodeio.dto.FecharCaixaRequest;
import com.arena.rodeio.dto.SangriaRequest;
import com.arena.rodeio.dto.SangriaResponse;
import com.arena.rodeio.model.Caixa;
import com.arena.rodeio.model.FormaPagamento;
import com.arena.rodeio.model.NivelAlertaNumerario;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.model.Sangria;
import com.arena.rodeio.model.StatusCaixa;
import com.arena.rodeio.repository.CaixaRepository;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;
import com.arena.rodeio.repository.SangriaRepository;
import com.arena.rodeio.repository.VendaRepository;

@Service
public class CaixaService {

    private final CaixaRepository caixaRepository;
    private final VendaRepository vendaRepository;
    private final SangriaRepository sangriaRepository;
    private final PerfilFuncionarioRepository perfilFuncionarioRepository;
    private final ValorHoraService valorHoraService;

    public CaixaService(CaixaRepository caixaRepository,
                        VendaRepository vendaRepository,
                        SangriaRepository sangriaRepository,
                        PerfilFuncionarioRepository perfilFuncionarioRepository,
                        ValorHoraService valorHoraService) {
        this.caixaRepository = caixaRepository;
        this.vendaRepository = vendaRepository;
        this.sangriaRepository = sangriaRepository;
        this.perfilFuncionarioRepository = perfilFuncionarioRepository;
        this.valorHoraService = valorHoraService;
    }

    /**
     * Abertura de caixa: exclusiva do MASTER_ADMIN (regra inegociável nº 7).
     * adminId (quem executa) e request.operadorId() (dono do caixa) nunca
     * são a mesma finalidade — mesmo que coincidam em valor num teste, o
     * significado registrado é sempre "admin abriu PARA o operador".
     */
    @Transactional
    public CaixaResponse abrir(UUID adminId, AberturaCaixaRequest request) {
        var operadorId = request.operadorId();

        if (caixaRepository.existsByOperadorIdAndStatus(operadorId, StatusCaixa.ABERTO)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Este operador já tem um caixa aberto. Feche o turno atual antes de abrir outro.");
        }

        var saldoInicial = request.saldoInicial().setScale(2, RoundingMode.HALF_EVEN);
        var caixa = caixaRepository.save(new Caixa(operadorId, adminId, saldoInicial));

        return CaixaResponse.from(caixa, saldoInicial, avaliarNivelAlerta(operadorId, saldoInicial));
    }

    /**
     * Sangria: recolhimento de dinheiro físico por um MASTER_ADMIN.
     * O @PreAuthorize do controller garante a role; aqui garantimos as
     * invariantes financeiras (caixa aberto, valor disponível em espécie).
     */
    @Transactional
    public SangriaResponse registrarSangria(UUID caixaId, UUID adminId, SangriaRequest request) {
        var caixa = buscarCaixaAberto(caixaId);
        var valor = request.valor().setScale(2, RoundingMode.HALF_EVEN);

        var saldoAtual = calcularSaldoEmEspecie(caixa);
        if (valor.compareTo(saldoAtual) > 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Sangria de R$ %s maior que o dinheiro em caixa (R$ %s)."
                    .formatted(valor, saldoAtual));
        }

        var sangria = sangriaRepository.save(new Sangria(caixa, adminId, valor));

        return SangriaResponse.from(sangria, saldoAtual.subtract(valor));
    }

    /**
     * Fechamento de caixa: exclusivo do MASTER_ADMIN (regra inegociável nº 7).
     * O valor contado fisicamente (request.valorFinalConfirmado) é gravado
     * junto com o saldo calculado no momento — a divergência entre os dois
     * (sobra/falta) fica registrada para sempre, mesmo que vendas futuras de
     * OUTRO caixa mudem os totais do operador.
     *
     * Também grava o snapshot de jornada (regra de negócio nova, controle de
     * jornada operacional): valor/hora resolvido AGORA (área do operador,
     * senão global) multiplicado pelas horas do turno inteiro. Se não houver
     * valor/hora configurado, o snapshot fica null — o fechamento NUNCA é
     * bloqueado por isso.
     */
    @Transactional
    public CaixaResponse fechar(UUID caixaId, FecharCaixaRequest request) {
        var caixa = caixaRepository.findById(caixaId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Caixa não encontrado."));

        if (!caixa.estaAberto()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Este caixa já foi fechado.");
        }

        var saldoEmEspecie = calcularSaldoEmEspecie(caixa);
        var valorFinal = request.valorFinalConfirmado().setScale(2, RoundingMode.HALF_EVEN);

        var areaTrabalho = perfilFuncionarioRepository.findById(caixa.getOperadorId())
            .map(PerfilFuncionario::getAreaTrabalho)
            .orElse(null);
        var valorHoraAplicado = valorHoraService.resolverValorHoraEfetivoAgora(areaTrabalho).orElse(null);
        var minutosTrabalhados = Duration.between(caixa.getDataAbertura(), Instant.now()).toMinutes();
        var valorTotalCalculado = valorHoraAplicado == null
            ? null
            : valorHoraAplicado.multiply(BigDecimal.valueOf(minutosTrabalhados))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_EVEN);

        caixa.fechar(valorFinal, request.motivo().trim(), valorHoraAplicado, valorTotalCalculado);

        return CaixaResponse.from(caixa, saldoEmEspecie, avaliarNivelAlerta(caixa.getOperadorId(), saldoEmEspecie));
    }

    /** Lista todos os caixas ABERTO — tela Gerenciamento de Equipe do Admin. */
    @Transactional(readOnly = true)
    public List<CaixaResponse> listarAbertos() {
        return caixaRepository.findByStatus(StatusCaixa.ABERTO).stream()
            .map(this::paraResponse)
            .toList();
    }

    /**
     * Lista todos os caixas FECHADO, mais recentes primeiro — alimenta o
     * Scorecard de Divergência (Master Admin backlog, item 3). Cada resposta
     * já carrega a divergência (sobra/falta) travada no fechamento.
     */
    @Transactional(readOnly = true)
    public List<CaixaResponse> listarFechados() {
        return caixaRepository.findByStatusOrderByDataFechamentoDesc(StatusCaixa.FECHADO).stream()
            .map(this::paraResponse)
            .toList();
    }

    /**
     * Status do próprio caixa do Operador (tela "Aguardando gerência abrir
     * caixa" / "Caixa Aberto"). Optional vazio quando não há turno aberto —
     * não é um erro, é o estado normal antes do Admin abrir o caixa.
     */
    @Transactional(readOnly = true)
    public Optional<CaixaResponse> buscarMeuCaixaAberto(UUID operadorId) {
        return caixaRepository.findByOperadorIdAndStatus(operadorId, StatusCaixa.ABERTO)
            .map(this::paraResponse);
    }

    private CaixaResponse paraResponse(Caixa caixa) {
        var saldoEmEspecie = calcularSaldoEmEspecie(caixa);
        return CaixaResponse.from(caixa, saldoEmEspecie, avaliarNivelAlerta(caixa.getOperadorId(), saldoEmEspecie));
    }

    /**
     * Regra de negócio nº 2 (revisada): escala o alerta de numerário contra
     * os limiares configuráveis por operador — nunca bloqueia venda, apenas
     * informa a gerência para decidir a sangria (regra inegociável nº 7).
     */
    public NivelAlertaNumerario avaliarNivelAlerta(UUID operadorId, BigDecimal saldoEmEspecie) {
        return perfilFuncionarioRepository.findById(operadorId)
            .map(perfil -> NivelAlertaNumerario.avaliar(
                saldoEmEspecie, perfil.getLimiteAtencao(), perfil.getLimiteCritico()))
            .orElse(NivelAlertaNumerario.NORMAL);
    }

    /**
     * Fonte única da verdade do dinheiro físico no caixa:
     * saldo_inicial + vendas em DINHEIRO − sangrias, tudo somado no banco.
     * Débito/crédito/PIX não acumulam espécie e ficam fora da conta.
     */
    public BigDecimal calcularSaldoEmEspecie(Caixa caixa) {
        var vendasEmDinheiro =
            vendaRepository.somarPorCaixaEFormaPagamento(caixa.getId(), FormaPagamento.DINHEIRO);
        var sangrias = sangriaRepository.somarPorCaixa(caixa.getId());

        return caixa.getSaldoInicial()
            .add(vendasEmDinheiro)
            .subtract(sangrias)
            .setScale(2, RoundingMode.HALF_EVEN);
    }

    /** Carrega o caixa e garante que está ABERTO (usado também pelo VendaService). */
    public Caixa buscarCaixaAberto(UUID caixaId) {
        var caixa = caixaRepository.findById(caixaId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Caixa não encontrado."));

        if (!caixa.estaAberto()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Este caixa já foi fechado. Nenhum lançamento é permitido.");
        }
        return caixa;
    }
}

package com.arena.rodeio.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.VendaRequest;
import com.arena.rodeio.dto.VendaResponse;
import com.arena.rodeio.model.FormaPagamento;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.model.Venda;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;
import com.arena.rodeio.repository.VendaRepository;

@Service
public class VendaService {

    private final VendaRepository vendaRepository;
    private final PerfilFuncionarioRepository perfilFuncionarioRepository;
    private final CaixaService caixaService;

    public VendaService(VendaRepository vendaRepository,
                        PerfilFuncionarioRepository perfilFuncionarioRepository,
                        CaixaService caixaService) {
        this.vendaRepository = vendaRepository;
        this.perfilFuncionarioRepository = perfilFuncionarioRepository;
        this.caixaService = caixaService;
    }

    /**
     * Registra a venda e, se for em DINHEIRO, avalia a regra de negócio nº 2:
     * quando (saldo_inicial + vendas em dinheiro − sangrias) alcança o
     * limiteSangria do operador, a resposta carrega ALERTA_SANGRIA_ATINGIDO.
     *
     * Transacional: a venda e a leitura do saldo saem na mesma transação —
     * o alerta reflete exatamente o estado do caixa incluindo esta venda.
     */
    @Transactional
    public VendaResponse registrar(UUID caixaId,
                                   UUID solicitanteId,
                                   boolean isMasterAdmin,
                                   VendaRequest request) {
        var caixa = caixaService.buscarCaixaAberto(caixaId);

        if (!isMasterAdmin && !caixa.getOperadorId().equals(solicitanteId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Este caixa pertence a outro operador. Lançamentos só no próprio caixa.");
        }

        var valor = request.valor().setScale(2, RoundingMode.HALF_EVEN);
        var venda = vendaRepository.save(new Venda(caixa, valor, request.formaPagamento()));

        // Soma no banco já enxerga a venda recém-persistida (flush automático
        // do Hibernate antes de queries sobre a mesma entidade).
        var saldoEmEspecie = caixaService.calcularSaldoEmEspecie(caixa);

        String alerta = null;
        if (request.formaPagamento() == FormaPagamento.DINHEIRO
                && atingiuLimiteDeSangria(caixa.getOperadorId(), saldoEmEspecie)) {
            alerta = VendaResponse.ALERTA_SANGRIA_ATINGIDO;
        }

        return VendaResponse.from(venda, saldoEmEspecie, alerta);
    }

    private boolean atingiuLimiteDeSangria(UUID operadorId, BigDecimal saldoEmEspecie) {
        return perfilFuncionarioRepository.findById(operadorId)
            .map(PerfilFuncionario::getLimiteSangria)
            .map(limite -> saldoEmEspecie.compareTo(limite) >= 0)
            .orElse(false);
    }
}

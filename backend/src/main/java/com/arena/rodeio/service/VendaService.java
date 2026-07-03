package com.arena.rodeio.service;

import java.math.RoundingMode;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.VendaRequest;
import com.arena.rodeio.dto.VendaResponse;
import com.arena.rodeio.model.Venda;
import com.arena.rodeio.repository.VendaRepository;

@Service
public class VendaService {

    private final VendaRepository vendaRepository;
    private final CaixaService caixaService;

    public VendaService(VendaRepository vendaRepository, CaixaService caixaService) {
        this.vendaRepository = vendaRepository;
        this.caixaService = caixaService;
    }

    /**
     * Registra a venda e avalia a regra de negócio nº 2 (revisada): o nível
     * de numerário sempre acompanha a resposta, mas NUNCA bloqueia a venda —
     * quem decide recolher o dinheiro é sempre a gerência.
     *
     * Transacional: a venda e a leitura do saldo saem na mesma transação —
     * o nível reflete exatamente o estado do caixa incluindo esta venda.
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
        var nivelAlerta = caixaService.avaliarNivelAlerta(caixa.getOperadorId(), saldoEmEspecie);

        return VendaResponse.from(venda, saldoEmEspecie, nivelAlerta);
    }
}

package com.arena.rodeio.service;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.SosAlertaRequest;
import com.arena.rodeio.dto.SosAlertaResponse;
import com.arena.rodeio.model.SosAlerta;
import com.arena.rodeio.model.StatusSos;
import com.arena.rodeio.repository.CaixaRepository;
import com.arena.rodeio.repository.SosAlertaRepository;

@Service
public class SosAlertaService {

    private final SosAlertaRepository sosAlertaRepository;
    private final CaixaRepository caixaRepository;

    public SosAlertaService(SosAlertaRepository sosAlertaRepository, CaixaRepository caixaRepository) {
        this.sosAlertaRepository = sosAlertaRepository;
        this.caixaRepository = caixaRepository;
    }

    /**
     * Persiste o histórico do SOS já entregue em tempo real via Supabase
     * Realtime Broadcast (canal "arena-sos", useCaixa.ts) — garante que a
     * gerência veja o alerta mesmo se o painel estava fechado no momento.
     */
    @Transactional
    public SosAlertaResponse registrar(UUID operadorId, SosAlertaRequest request) {
        var caixa = caixaRepository.findById(request.caixaId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Caixa não encontrado."));

        var alerta = sosAlertaRepository.save(
            new SosAlerta(caixa, operadorId, request.operadorNome(), request.categoria(), request.saldoEmEspecie()));

        return SosAlertaResponse.from(alerta);
    }

    /** Painel do Admin: alertas ainda não atendidos, inclusive os de antes desta sessão. */
    @Transactional(readOnly = true)
    public List<SosAlertaResponse> listarAbertos() {
        return sosAlertaRepository.findByStatusOrderByCriadoEmDesc(StatusSos.ABERTO).stream()
            .map(SosAlertaResponse::from)
            .toList();
    }

    /** Marca que a gerência já chegou ao posto — exclusivo do MASTER_ADMIN. */
    @Transactional
    public SosAlertaResponse atender(UUID id, UUID adminId) {
        var alerta = sosAlertaRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SOS não encontrado."));

        alerta.atender(adminId);

        return SosAlertaResponse.from(alerta);
    }
}

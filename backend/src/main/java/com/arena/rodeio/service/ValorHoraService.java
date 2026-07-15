package com.arena.rodeio.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.arena.rodeio.dto.HistoricoValorHoraResponse;
import com.arena.rodeio.dto.SalvarValorHoraRequest;
import com.arena.rodeio.dto.ValorHoraAtualResponse;
import com.arena.rodeio.dto.ValorVigenteResponse;
import com.arena.rodeio.model.ConfiguracaoValorHora;
import com.arena.rodeio.model.EscopoValorHora;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.repository.ConfiguracaoValorHoraRepository;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;

@Service
public class ValorHoraService {

    private final ConfiguracaoValorHoraRepository repository;
    private final PerfilFuncionarioRepository perfilFuncionarioRepository;

    public ValorHoraService(ConfiguracaoValorHoraRepository repository,
                            PerfilFuncionarioRepository perfilFuncionarioRepository) {
        this.repository = repository;
        this.perfilFuncionarioRepository = perfilFuncionarioRepository;
    }

    @Transactional(readOnly = true)
    public ValorHoraAtualResponse buscarAtual() {
        var global = repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL).stream()
            .findFirst()
            .map(this::paraVigente)
            .orElse(null);

        var overrides = repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA).stream()
            .map(this::paraVigente)
            .sorted(Comparator.comparing(ValorVigenteResponse::areaTrabalho))
            .toList();

        return new ValorHoraAtualResponse(global, overrides);
    }

    @Transactional(readOnly = true)
    public List<HistoricoValorHoraResponse> buscarHistorico() {
        return repository.findAllByOrderByVigenciaInicioDesc().stream()
            .map(config -> HistoricoValorHoraResponse.from(config, nomeAdmin(config.getCriadoPorAdminId())))
            .toList();
    }

    /**
     * Resolve o valor/hora vigente AGORA para uma área: override da área,
     * senão o valor global; Optional.empty() se nada estiver configurado
     * ainda. Nunca lança exceção — o fechamento de caixa não pode ser
     * bloqueado por falta de configuração (regra de negócio nº 2, adaptada).
     */
    @Transactional(readOnly = true)
    public Optional<BigDecimal> resolverValorHoraEfetivoAgora(String areaTrabalho) {
        if (areaTrabalho != null) {
            var override = repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, areaTrabalho);
            if (override.isPresent()) {
                return override.map(ConfiguracaoValorHora::getValorHora);
            }
        }

        return repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL).stream()
            .findFirst()
            .map(ConfiguracaoValorHora::getValorHora);
    }

    /**
     * Substitui o estado inteiro: versiona o valor global se mudou, versiona
     * cada override enviado se mudou/é novo, e encerra os overrides que não
     * vieram mais na lista (a área volta a herdar o valor global).
     */
    @Transactional
    public ValorHoraAtualResponse salvar(UUID adminId, SalvarValorHoraRequest request) {
        var valorGlobalNovo = request.valorHoraGlobal().setScale(2, RoundingMode.HALF_EVEN);
        aplicarValor(EscopoValorHora.GLOBAL, null, valorGlobalNovo, adminId);

        var areasEnviadas = request.overrides().stream()
            .collect(Collectors.toMap(
                item -> item.area().trim(),
                item -> item.valorHora().setScale(2, RoundingMode.HALF_EVEN)));

        areasEnviadas.forEach((area, valor) -> aplicarValor(EscopoValorHora.AREA, area, valor, adminId));

        repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA).stream()
            .filter(config -> !areasEnviadas.containsKey(config.getAreaTrabalho()))
            .forEach(ConfiguracaoValorHora::encerrar);

        return buscarAtual();
    }

    /** Só versiona (encerra o antigo + cria um novo) quando o valor realmente muda. */
    private void aplicarValor(EscopoValorHora escopo, String area, BigDecimal novoValor, UUID adminId) {
        Optional<ConfiguracaoValorHora> ativoAtual = escopo == EscopoValorHora.GLOBAL
            ? repository.findByEscopoAndAtivoTrue(escopo).stream().findFirst()
            : repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(escopo, area);

        if (ativoAtual.isPresent() && ativoAtual.get().getValorHora().compareTo(novoValor) == 0) {
            return;
        }

        ativoAtual.ifPresent(ConfiguracaoValorHora::encerrar);
        repository.save(new ConfiguracaoValorHora(escopo, area, novoValor, adminId));
    }

    private ValorVigenteResponse paraVigente(ConfiguracaoValorHora config) {
        return ValorVigenteResponse.from(config, nomeAdmin(config.getCriadoPorAdminId()));
    }

    private String nomeAdmin(UUID adminId) {
        return perfilFuncionarioRepository.findById(adminId)
            .map(PerfilFuncionario::getNomeCompleto)
            .orElse("Admin removido");
    }
}

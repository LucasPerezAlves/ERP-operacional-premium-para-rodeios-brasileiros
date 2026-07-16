package com.arena.rodeio.service;

import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.ProdutoRequest;
import com.arena.rodeio.dto.ProdutoResponse;
import com.arena.rodeio.model.Produto;
import com.arena.rodeio.repository.ProdutoRepository;

@Service
public class ProdutoService {

    private final ProdutoRepository repository;

    public ProdutoService(ProdutoRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public ProdutoResponse cadastrar(ProdutoRequest request) {
        var produto = new Produto(
            request.nome().trim(),
            request.categoria(),
            request.quantidadeEstoque(),
            request.valorVenda().setScale(2, RoundingMode.HALF_EVEN),
            request.valorCusto().setScale(2, RoundingMode.HALF_EVEN));

        return ProdutoResponse.from(repository.save(produto));
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> listarAtivos() {
        return repository.findByAtivoTrueOrderByNomeAsc().stream()
            .map(ProdutoResponse::from)
            .toList();
    }

    @Transactional
    public ProdutoResponse atualizar(UUID id, ProdutoRequest request) {
        var produto = buscarEntidade(id);

        produto.setNome(request.nome().trim());
        produto.setCategoria(request.categoria());
        produto.setQuantidadeEstoque(request.quantidadeEstoque());
        produto.setValorVenda(request.valorVenda().setScale(2, RoundingMode.HALF_EVEN));
        produto.setValorCusto(request.valorCusto().setScale(2, RoundingMode.HALF_EVEN));

        return ProdutoResponse.from(produto);
    }

    @Transactional
    public ProdutoResponse desativar(UUID id) {
        var produto = buscarEntidade(id);
        produto.desativar();
        return ProdutoResponse.from(produto);
    }

    private Produto buscarEntidade(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Produto não encontrado."));
    }
}

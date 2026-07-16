import { useCallback, useEffect, useState } from "react";
import {
  atualizarProduto,
  criarProduto,
  desativarProduto,
  listarProdutos,
  ApiError,
  type CategoriaProduto,
  type ProdutoApi,
} from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";
import { tocarErro, tocarSucesso } from "../lib/sons";

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  quantidadeEstoque: number;
  valorVendaCentavos: number;
  valorCustoCentavos: number;
  ativo: boolean;
}

export interface DadosProduto {
  nome: string;
  categoria: CategoriaProduto;
  quantidadeEstoque: number;
  valorVendaCentavos: number;
  valorCustoCentavos: number;
}

function paraProduto(api: ProdutoApi): Produto {
  return {
    id: api.id,
    nome: api.nome,
    categoria: api.categoria,
    quantidadeEstoque: api.quantidadeEstoque,
    valorVendaCentavos: reaisParaCentavos(api.valorVenda),
    valorCustoCentavos: reaisParaCentavos(api.valorCusto),
    ativo: api.ativo,
  };
}

/**
 * Cadastro de Estoque (Admin): CRUD do catálogo de produtos — peça 1 de 6
 * do Módulo 3. Sem integração com Combo-Click, Carga de Pista/Bar ou
 * Centro de Operações nesta entrega.
 */
export function useEstoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarProdutos();
      setProdutos(lista.map(paraProduto));
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o estoque.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleCadastrar = useCallback(
    async (dados: DadosProduto): Promise<boolean> => {
      setSalvandoId("novo");
      setErro(null);
      try {
        await criarProduto(dados);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao cadastrar o produto.");
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  const handleAtualizar = useCallback(
    async (id: string, dados: DadosProduto): Promise<boolean> => {
      setSalvandoId(id);
      setErro(null);
      try {
        await atualizarProduto(id, dados);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao atualizar o produto.");
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  const handleDesativar = useCallback(
    async (id: string): Promise<boolean> => {
      setSalvandoId(id);
      setErro(null);
      try {
        await desativarProduto(id);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao desativar o produto.");
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  return {
    produtos,
    carregando,
    erro,
    limparErro: () => setErro(null),
    salvandoId,
    handleCadastrar,
    handleAtualizar,
    handleDesativar,
  };
}

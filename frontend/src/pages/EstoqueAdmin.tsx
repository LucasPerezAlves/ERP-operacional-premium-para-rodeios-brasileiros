import { useState } from "react";
import Alerta from "../components/ui/Alerta";
import { Carregando } from "../components/ui/interacoes";
import Botao from "../components/ui/Botao";
import ProdutoModal from "../components/estoque/ProdutoModal";
import Modal from "../components/ui/Modal";
import { useEstoque, type Produto, type DadosProduto } from "../hooks/useEstoque";
import { formatarCentavos } from "../lib/moeda";
import { CaixoteIcon, PlacaIcon } from "../components/icons";

const ROTULO_CATEGORIA: Record<Produto["categoria"], string> = {
  BEBIDA: "Bebida",
  COMIDA: "Comida",
  INGRESSO: "Ingresso",
  OUTRO: "Outro",
};

/**
 * Cadastro de Estoque (Admin): catálogo de produtos — peça 1 de 6 do
 * Módulo 3. Sem integração com Combo-Click, Carga de Pista/Bar ou Centro
 * de Operações nesta entrega.
 */
export default function EstoqueAdmin() {
  const { produtos, carregando, erro, limparErro, salvandoId, handleCadastrar, handleAtualizar, handleDesativar } =
    useEstoque();
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [produtoParaDesativar, setProdutoParaDesativar] = useState<Produto | null>(null);

  function abrirNovo() {
    setProdutoEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(produto: Produto) {
    setProdutoEditando(produto);
    setModalAberto(true);
  }

  async function confirmar(dados: DadosProduto) {
    const sucesso = produtoEditando
      ? await handleAtualizar(produtoEditando.id, dados)
      : await handleCadastrar(dados);
    if (sucesso) setModalAberto(false);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 font-display text-2xl text-gold-300 md:text-3xl">
          <CaixoteIcon className="h-6 w-6 text-gold-400" />
          Estoque
        </h1>
        <Botao variante="couro" tamanho="sm" onClick={abrirNovo}>
          Novo Produto
        </Botao>
      </div>
      <p className="mt-1 text-[15px] text-leather-300">
        Cadastro do catálogo de produtos — nome, categoria, quantidade e valores.
      </p>

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {carregando ? (
        <Carregando rotulo="Carregando estoque..." />
      ) : produtos.length === 0 ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
          <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
          Nenhum produto cadastrado ainda.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-leather-600/40 bg-wood-900 shadow-arena">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-leather-600/40 text-xs uppercase tracking-wide text-steel-400">
                <th className="px-4 py-3 font-semibold">Produto</th>
                <th className="px-4 py-3 font-semibold">Categoria</th>
                <th className="px-4 py-3 font-semibold">Quantidade</th>
                <th className="px-4 py-3 font-semibold">Valor venda</th>
                <th className="px-4 py-3 font-semibold">Valor custo</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-leather-600/20">
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td className="px-4 py-3 font-semibold text-leather-200">{produto.nome}</td>
                  <td className="px-4 py-3 text-leather-300">{ROTULO_CATEGORIA[produto.categoria]}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">{produto.quantidadeEstoque}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {formatarCentavos(produto.valorVendaCentavos)}
                  </td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {formatarCentavos(produto.valorCustoCentavos)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Botao variante="couro" tamanho="sm" onClick={() => abrirEdicao(produto)}>
                        Editar
                      </Botao>
                      <Botao
                        variante="lampiao"
                        tamanho="sm"
                        carregando={salvandoId === produto.id}
                        rotuloCarregando="..."
                        onClick={() => setProdutoParaDesativar(produto)}
                      >
                        Desativar
                      </Botao>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <ProdutoModal
          produto={produtoEditando}
          salvando={salvandoId === (produtoEditando?.id ?? "novo")}
          onConfirmar={confirmar}
          onCancelar={() => setModalAberto(false)}
        />
      )}

      {produtoParaDesativar && (
        <Modal titulo="Desativar produto" onFechar={() => setProdutoParaDesativar(null)}>
          <p className="mt-4 text-[15px] text-leather-300">
            Desativar <span className="font-semibold text-leather-200">{produtoParaDesativar.nome}</span>?
            Ele deixa de aparecer na lista de produtos ativos. Não há uma tela de reativação ainda —
            seria preciso reverter direto no banco.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Botao variante="couro" tamanho="lg" onClick={() => setProdutoParaDesativar(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="lampiao"
              tamanho="lg"
              carregando={salvandoId === produtoParaDesativar.id}
              rotuloCarregando="Desativando..."
              onClick={async () => {
                const sucesso = await handleDesativar(produtoParaDesativar.id);
                if (sucesso) setProdutoParaDesativar(null);
              }}
            >
              Confirmar
            </Botao>
          </div>
        </Modal>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Botao from "../ui/Botao";
import { BackspaceIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";
import { useCentavosMultiCampo } from "../../hooks/useCentavosMultiCampo";
import { useTecladoNumerico } from "../../hooks/useTecladoNumerico";
import type { CategoriaProduto } from "../../lib/api";
import type { DadosProduto, Produto } from "../../hooks/useEstoque";

const CAMPO_VENDA = "venda";
const CAMPO_CUSTO = "custo";
const DIGITOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const CATEGORIAS: Array<{ valor: CategoriaProduto; rotulo: string }> = [
  { valor: "BEBIDA", rotulo: "Bebida" },
  { valor: "COMIDA", rotulo: "Comida" },
  { valor: "INGRESSO", rotulo: "Ingresso" },
  { valor: "OUTRO", rotulo: "Outro" },
];

type CampoAtivo = "quantidade" | typeof CAMPO_VENDA | typeof CAMPO_CUSTO;

/**
 * Cadastro/edição de produto do estoque — nome, categoria, quantidade
 * (inteiro, controlado localmente) e valor de venda/custo (teclado de
 * centavos compartilhado, mesmo padrão de ValoresHoraModal).
 */
export default function ProdutoModal({
  produto,
  salvando,
  onConfirmar,
  onCancelar,
}: {
  produto: Produto | null;
  salvando: boolean;
  onConfirmar: (dados: DadosProduto) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoria, setCategoria] = useState<CategoriaProduto>(produto?.categoria ?? "BEBIDA");
  const [quantidade, setQuantidade] = useState(produto?.quantidadeEstoque ?? 0);
  const [campoAtivo, setCampoAtivo] = useState<CampoAtivo>("quantidade");
  const campos = useCentavosMultiCampo([CAMPO_VENDA, CAMPO_CUSTO]);

  useEffect(() => {
    if (!produto) return;
    campos.definirValor(CAMPO_VENDA, produto.valorVendaCentavos);
    campos.definirValor(CAMPO_CUSTO, produto.valorCustoCentavos);
    // Só reidrata quando o produto (edição) muda — não a cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto]);

  /** Sincroniza os dois estados de campo ativo NO CLIQUE — nunca dentro de digitar/apagar (ver nota da task). */
  function selecionarCampo(campo: CampoAtivo) {
    setCampoAtivo(campo);
    if (campo !== "quantidade") campos.setCampoAtivo(campo);
  }

  function digitar(tecla: string) {
    if (campoAtivo === "quantidade") {
      setQuantidade((atual) => {
        const proximo = atual * 10 + Number(tecla);
        return proximo > 999_999 ? atual : proximo;
      });
    } else {
      campos.digitar(tecla);
    }
  }

  function apagar() {
    if (campoAtivo === "quantidade") {
      setQuantidade((atual) => Math.floor(atual / 10));
    } else {
      campos.apagar();
    }
  }

  useTecladoNumerico(digitar, apagar);

  const nomeValido = nome.trim().length > 0;
  const podeConfirmar = nomeValido && !salvando;

  function confirmar() {
    if (!podeConfirmar) return;
    onConfirmar({
      nome: nome.trim(),
      categoria,
      quantidadeEstoque: quantidade,
      valorVendaCentavos: campos.valores[CAMPO_VENDA],
      valorCustoCentavos: campos.valores[CAMPO_CUSTO],
    });
  }

  return (
    <Modal titulo={produto ? "Editar produto" : "Novo produto"} onFechar={onCancelar}>
      <div className="mt-4">
        <label htmlFor="produto-nome" className="mb-1.5 block text-[13px] font-medium text-leather-200">
          Nome
        </label>
        <input
          id="produto-nome"
          type="text"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Ex.: Cerveja lata, Espetinho, Ingresso Rodeio..."
          className="w-full rounded-lg border border-leather-500/50 bg-wood-900 p-3 text-[15px] text-leather-200 outline-none transition-colors duration-200 placeholder:text-leather-400/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/20"
        />
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-medium text-leather-200">Categoria</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((item) => (
            <button
              key={item.valor}
              type="button"
              onClick={() => setCategoria(item.valor)}
              className={`min-h-11 touch-manipulation rounded-lg border-2 text-sm font-semibold transition-colors duration-150 ease-couro ${
                categoria === item.valor
                  ? "border-gold-500 bg-arena-800 text-gold-300"
                  : "border-leather-600/40 text-leather-300 hover:border-gold-500/60"
              }`}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => selecionarCampo("quantidade")}
          className={`rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
            campoAtivo === "quantidade" ? "border-gold-500 bg-arena-800" : "border-leather-600/40 bg-arena-900"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">Quantidade</p>
          <p className="num-tabular mt-1 text-xl font-bold text-leather-200">{quantidade}</p>
        </button>
        <button
          type="button"
          onClick={() => selecionarCampo(CAMPO_VENDA)}
          className={`rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
            campoAtivo === CAMPO_VENDA ? "border-gold-500 bg-arena-800" : "border-leather-600/40 bg-arena-900"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">Valor venda</p>
          <p className="num-tabular mt-1 text-lg font-bold text-leather-200">
            {formatarCentavos(campos.valores[CAMPO_VENDA])}
          </p>
        </button>
        <button
          type="button"
          onClick={() => selecionarCampo(CAMPO_CUSTO)}
          className={`rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
            campoAtivo === CAMPO_CUSTO ? "border-gold-500 bg-arena-800" : "border-leather-600/40 bg-arena-900"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">Valor custo</p>
          <p className="num-tabular mt-1 text-lg font-bold text-leather-200">
            {formatarCentavos(campos.valores[CAMPO_CUSTO])}
          </p>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {DIGITOS.map((digito) => (
          <button
            key={digito}
            type="button"
            onClick={() => digitar(digito)}
            className="num-tabular min-h-12 touch-manipulation rounded-lg border border-leather-600/50 bg-wood-900 text-xl font-bold text-leather-200 transition-colors duration-150 ease-couro hover:border-gold-500 active:scale-95"
          >
            {digito}
          </button>
        ))}
        <button
          type="button"
          onClick={apagar}
          aria-label="Apagar último dígito"
          className="flex min-h-12 touch-manipulation items-center justify-center rounded-lg border border-leather-600/50 bg-wood-900 text-leather-400 transition-colors duration-150 ease-couro hover:border-gold-500 hover:text-leather-200 active:scale-95"
        >
          <BackspaceIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => (campoAtivo === "quantidade" ? setQuantidade(0) : campos.zerar())}
          className="min-h-12 touch-manipulation rounded-lg border border-rust-500/40 bg-wood-900 text-sm font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
        >
          Zerar
        </button>
      </div>
      <p className="mt-2 text-xs text-leather-400/70">
        Toque em Quantidade, Valor venda ou Valor custo para digitar nele. Também aceita o teclado do computador.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Botao variante="couro" tamanho="lg" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao
          variante="latao"
          tamanho="lg"
          disabled={!podeConfirmar}
          carregando={salvando}
          rotuloCarregando="Salvando..."
          onClick={confirmar}
        >
          Salvar
        </Botao>
      </div>
    </Modal>
  );
}

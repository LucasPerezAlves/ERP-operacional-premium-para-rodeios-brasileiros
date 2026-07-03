import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import CalculadoraTroco from "../components/pdv/CalculadoraTroco";
import SosGerencia from "../components/pdv/SosGerencia";
import { useCaixa, type VendaConcluida } from "../hooks/useCaixa";
import { formatarCentavos } from "../lib/moeda";
import type { FormaPagamento } from "../lib/api";
import { BackspaceIcon, SetaEsquerdaIcon } from "../components/icons";
import Alerta from "../components/ui/Alerta";
import Botao from "../components/ui/Botao";
import SeloCaixa from "../components/ui/SeloCaixa";
import SeloNumerario from "../components/ui/SeloNumerario";
import { Carregando, SucessoOperacional } from "../components/ui/interacoes";

// ---------------------------------------------------------------------------
// Lançamento Rápido (Combo-Click): atalhos do posto. Ficam no front até o
// módulo de estoque trazer cadastro de produtos.
// ---------------------------------------------------------------------------

interface ComboItem {
  rotulo: string;
  valorCentavos: number;
  combo?: boolean;
}

const COMBOS: ComboItem[] = [
  { rotulo: "Ingresso Rodeio", valorCentavos: 4000 },
  { rotulo: "Ingresso Baile", valorCentavos: 6000 },
  { rotulo: "Estacionamento", valorCentavos: 2000 },
  { rotulo: "Rodeio + Estac.", valorCentavos: 5000, combo: true },
  { rotulo: "Cerveja", valorCentavos: 1000 },
  { rotulo: "Água", valorCentavos: 500 },
  { rotulo: "Refrigerante", valorCentavos: 800 },
  { rotulo: "Espetinho", valorCentavos: 1500 },
];

const VALOR_POR_ROTULO = new Map(COMBOS.map((item) => [item.rotulo, item.valorCentavos]));

const FORMAS: Array<{ valor: FormaPagamento; rotulo: string }> = [
  { valor: "DINHEIRO", rotulo: "Dinheiro" },
  { valor: "DEBITO", rotulo: "Débito" },
  { valor: "CREDITO", rotulo: "Crédito" },
  { valor: "PIX", rotulo: "Pix" },
];

type Etapa =
  | { nome: "vitrine" }
  | { nome: "troco" }
  | { nome: "concluida"; venda: VendaConcluida };

/**
 * PDV de venda — acessado a partir do card "Vender" na landing do Operador.
 * Carrinho itemizado: cada toque num combo vira um item contável (o operador
 * confere "3 cervejas" com o cliente antes de cobrar), com desfazer do
 * último item. Sem caixa aberto, redireciona de volta (regra nº 7).
 */
export default function OperadorVenda() {
  const {
    caixa,
    carregandoStatus,
    enviando,
    erro,
    limparErro,
    sosStatus,
    vender,
    chamarGerencia,
  } = useCaixa();

  const [itens, setItens] = useState<string[]>([]);
  const [etapa, setEtapa] = useState<Etapa>({ nome: "vitrine" });

  const totalCentavos = useMemo(
    () => itens.reduce((soma, rotulo) => soma + (VALOR_POR_ROTULO.get(rotulo) ?? 0), 0),
    [itens],
  );

  const quantidadePorRotulo = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const rotulo of itens) {
      contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + 1);
    }
    return contagem;
  }, [itens]);

  async function finalizarVenda(forma: FormaPagamento, recebidoCentavos?: number) {
    const venda = await vender(totalCentavos, forma, recebidoCentavos);
    if (venda) {
      setItens([]);
      setEtapa({ nome: "concluida", venda });
    }
  }

  if (carregandoStatus) {
    return (
      <DashboardLayout titulo="Vender">
        <Carregando rotulo="Consultando seu caixa..." />
      </DashboardLayout>
    );
  }

  // Sem caixa aberto: não há o que vender — volta pra landing de funções.
  if (!caixa) {
    return <Navigate to="/operador-dashboard" replace />;
  }

  return (
    <DashboardLayout titulo="Vender">
      <Link
        to="/operador-dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-300 transition-colors duration-200 hover:text-gold-200"
      >
        <SetaEsquerdaIcon className="h-4 w-4" />
        Minhas funções
      </Link>

      {erro && (
        <Alerta tipo="erro" className="mb-6" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      <div className="select-none">
        {/* Barra de status do caixa */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-leather-600/40 bg-wood-900 px-6 py-4 shadow-arena">
          <div className="flex flex-wrap items-center gap-3">
            <SeloCaixa aberto saldoCentavos={undefined} />
            <SeloNumerario nivel={caixa.nivelAlerta} />
          </div>
          <div className="rounded-lg bg-arena-800 px-4 py-2 text-right">
            <p className="text-xs text-leather-400">Em espécie</p>
            <p className="num-tabular text-2xl font-bold text-gold-200">
              {formatarCentavos(caixa.saldoEmEspecieCentavos)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {etapa.nome === "vitrine" && (
            <>
              {/* Total acumulado + controles do carrinho */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <p>
                  <span className="block text-sm text-leather-400">Total da venda</span>
                  <span className="num-tabular text-5xl font-bold tracking-tight text-leather-200 md:text-6xl">
                    {formatarCentavos(totalCentavos)}
                  </span>
                </p>
                {itens.length > 0 && (
                  <div className="flex gap-3">
                    <Botao
                      variante="couro"
                      tamanho="lg"
                      onClick={() => setItens((atual) => atual.slice(0, -1))}
                    >
                      <BackspaceIcon className="h-5 w-5" />
                      Desfazer último
                    </Botao>
                    <button
                      type="button"
                      onClick={() => setItens([])}
                      className="min-h-14 touch-manipulation rounded-lg border-2 border-rust-500/50 px-6 text-base font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>

              {/* Grid de Combo-Click com contador por item */}
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {COMBOS.map((item) => {
                  const quantidade = quantidadePorRotulo.get(item.rotulo) ?? 0;
                  return (
                    <button
                      key={item.rotulo}
                      type="button"
                      onClick={() => setItens((atual) => [...atual, item.rotulo])}
                      className={`relative min-h-28 touch-manipulation rounded-xl border-2 p-3 text-center transition-transform duration-100 ease-couro active:scale-95 ${
                        item.combo
                          ? "costura border-gold-500/60 bg-wood-800"
                          : "border-leather-600/50 bg-wood-900 hover:border-gold-500"
                      }`}
                    >
                      {quantidade > 0 && (
                        <span className="num-tabular absolute left-2 top-2 rounded-md bg-gold-400 px-2 py-0.5 text-sm font-black text-wood-950">
                          {quantidade}×
                        </span>
                      )}
                      {item.combo && (
                        <span className="absolute right-2 top-2 rounded-md bg-gold-400 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-wood-950">
                          Combo
                        </span>
                      )}
                      <span className="block text-xl font-bold leading-tight text-leather-200">
                        {item.rotulo}
                      </span>
                      <span className="num-tabular mt-1 block text-2xl font-bold text-gold-300">
                        {formatarCentavos(item.valorCentavos)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Formas de pagamento — ação final, botões largos */}
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {FORMAS.map((forma) => {
                  const desabilitada = itens.length === 0 || enviando;

                  if (forma.valor === "DINHEIRO") {
                    return (
                      <Botao
                        key={forma.valor}
                        variante="latao"
                        tamanho="pdv"
                        disabled={desabilitada}
                        carregando={enviando}
                        onClick={() => setEtapa({ nome: "troco" })}
                      >
                        {forma.rotulo}
                      </Botao>
                    );
                  }

                  return (
                    <Botao
                      key={forma.valor}
                      variante="couro"
                      tamanho="pdv"
                      className="bg-wood-900 font-bold"
                      disabled={desabilitada}
                      carregando={enviando}
                      onClick={() => finalizarVenda(forma.valor)}
                    >
                      {forma.rotulo}
                    </Botao>
                  );
                })}
              </div>
            </>
          )}

          {etapa.nome === "troco" && (
            <CalculadoraTroco
              totalCentavos={totalCentavos}
              enviando={enviando}
              onConfirmar={(recebido) => finalizarVenda("DINHEIRO", recebido)}
              onVoltar={() => setEtapa({ nome: "vitrine" })}
            />
          )}

          {etapa.nome === "concluida" && (
            <div className="mx-auto max-w-2xl">
              {/* Sucesso = ferradura dourada + varredura metálica (nunca verde de SaaS) */}
              <SucessoOperacional titulo="Venda registrada">
                <p className="num-tabular mt-2 text-xl text-leather-300">
                  {formatarCentavos(etapa.venda.valorCentavos)} em{" "}
                  {etapa.venda.formaPagamento.toLowerCase()}
                </p>
              </SucessoOperacional>

              {etapa.venda.trocoCentavos !== null && (
                <div className="material-rotulo mt-6 rounded-xl bg-arena-900 p-8">
                  <p className="text-xl font-semibold text-leather-300">Troco a devolver</p>
                  <p className="num-tabular font-display text-8xl leading-none tracking-tight text-campo-300 md:text-9xl">
                    {formatarCentavos(etapa.venda.trocoCentavos)}
                  </p>
                </div>
              )}

              <Botao
                variante="latao"
                tamanho="pdv"
                className="mt-8 w-full font-display tracking-widest"
                onClick={() => setEtapa({ nome: "vitrine" })}
              >
                Nova Venda
              </Botao>
            </div>
          )}
        </div>

        <SosGerencia status={sosStatus} onAcionar={chamarGerencia} />
      </div>
    </DashboardLayout>
  );
}

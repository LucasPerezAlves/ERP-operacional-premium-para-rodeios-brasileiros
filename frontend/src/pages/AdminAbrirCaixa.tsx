import { useState } from "react";
import { Link } from "react-router-dom";
import AberturaCaixa from "../components/pdv/AberturaCaixa";
import { useAdminAbrirCaixa, type OperadorParaAbertura } from "../hooks/useAdminAbrirCaixa";
import { SetaEsquerdaIcon } from "../components/icons";
import Alerta from "../components/ui/Alerta";
import Avatar from "../components/ui/Avatar";
import Botao from "../components/ui/Botao";
import SeloCaixa from "../components/ui/SeloCaixa";
import { Carregando, SucessoOperacional } from "../components/ui/interacoes";

type Etapa =
  | { nome: "selecionar" }
  | { nome: "definir-troco"; operador: OperadorParaAbertura }
  | { nome: "concluido"; operador: OperadorParaAbertura };

/**
 * Fluxo "Abrir Caixa" do Admin (regra inegociável nº 7): escolhe o operador
 * numa lista com foto e área de trabalho — quem já tem caixa aberto aparece
 * com a ferradura acesa e não é selecionável — e define o troco inicial.
 */
export default function AdminAbrirCaixa() {
  const { operadores, carregando, enviando, erro, limparErro, recarregar, abrirCaixa } =
    useAdminAbrirCaixa();
  const [etapa, setEtapa] = useState<Etapa>({ nome: "selecionar" });

  async function confirmarAbertura(operador: OperadorParaAbertura, saldoInicialCentavos: number) {
    const sucesso = await abrirCaixa(operador.id, saldoInicialCentavos);
    if (sucesso) {
      setEtapa({ nome: "concluido", operador });
    }
  }

  return (
    <>
      <h1 className="mb-6 font-display text-2xl text-gold-300 md:text-3xl">
        Abrir Caixa
      </h1>

      {erro && (
        <Alerta tipo="erro" className="mb-6" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {etapa.nome === "selecionar" && (
        <>
          <h2 className="font-display text-2xl text-gold-300">Escolha o operador</h2>
          <p className="mt-1 text-[15px] text-leather-300">
            Toque no funcionário que vai receber o caixa neste turno.
          </p>

          {carregando ? (
            <Carregando rotulo="Carregando equipe..." />
          ) : operadores.length === 0 ? (
            <div className="mt-8 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-center text-leather-300">
              Nenhum operador aprovado disponível. Aprove cadastros em Gerenciar
              Equipe primeiro.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {operadores.map((operador) => {
                const temCaixa = operador.caixaAbertoCentavos !== null;

                if (temCaixa) {
                  return (
                    <div
                      key={operador.id}
                      className="flex flex-col gap-3 rounded-xl border border-leather-600/30 bg-wood-900/60 p-5 opacity-70"
                      aria-disabled="true"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar nome={operador.nomeCompleto} fotoUrl={operador.fotoUrl} tamanho="lg" />
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold text-leather-200">
                            {operador.nomeCompleto || operador.email}
                          </p>
                          <p className="truncate text-sm text-steel-400">
                            {operador.areaTrabalho || "Área não informada"}
                          </p>
                        </div>
                      </div>
                      <SeloCaixa aberto saldoCentavos={operador.caixaAbertoCentavos ?? 0} />
                    </div>
                  );
                }

                return (
                  <button
                    key={operador.id}
                    type="button"
                    onClick={() => setEtapa({ nome: "definir-troco", operador })}
                    className="flex touch-manipulation items-center gap-4 rounded-xl border border-leather-600/40 bg-wood-900 p-5 text-left shadow-arena transition-colors duration-200 ease-couro hover:border-gold-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30 active:scale-[0.99]"
                  >
                    <Avatar nome={operador.nomeCompleto} fotoUrl={operador.fotoUrl} tamanho="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-leather-200">
                        {operador.nomeCompleto || operador.email}
                      </p>
                      <p className="truncate text-sm text-steel-400">
                        {operador.areaTrabalho || "Área não informada"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {etapa.nome === "definir-troco" && (
        <>
          <Botao
            variante="couro"
            tamanho="md"
            className="mb-4"
            onClick={() => setEtapa({ nome: "selecionar" })}
          >
            <SetaEsquerdaIcon className="h-4 w-4" />
            Trocar operador
          </Botao>

          <div className="mb-6 flex items-center gap-4 rounded-xl border border-leather-600/40 bg-arena-800 p-4">
            <Avatar nome={etapa.operador.nomeCompleto} fotoUrl={etapa.operador.fotoUrl} tamanho="lg" />
            <div>
              <p className="text-lg font-bold text-leather-200">{etapa.operador.nomeCompleto}</p>
              <p className="text-sm text-steel-400">
                {etapa.operador.areaTrabalho || "Área não informada"}
              </p>
            </div>
          </div>

          <AberturaCaixa
            enviando={enviando}
            onAbrir={(saldoInicialCentavos) => confirmarAbertura(etapa.operador, saldoInicialCentavos)}
          />
        </>
      )}

      {etapa.nome === "concluido" && (
        <div className="mx-auto max-w-xl">
          <SucessoOperacional titulo="Caixa aberto">
            <p className="mt-3 text-xl text-leather-300">
              {etapa.operador.nomeCompleto} já pode começar a vender.
            </p>
          </SucessoOperacional>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Botao
              variante="couro"
              tamanho="lg"
              onClick={() => {
                recarregar();
                setEtapa({ nome: "selecionar" });
              }}
            >
              Abrir outro caixa
            </Botao>
            <Link
              to="/admin-dashboard"
              className="btn-skeuo inline-flex min-h-14 touch-manipulation items-center justify-center gap-3 rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 px-6 text-base font-bold uppercase tracking-wider text-wood-950 hover:from-gold-300 hover:to-gold-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30"
            >
              Voltar ao painel
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

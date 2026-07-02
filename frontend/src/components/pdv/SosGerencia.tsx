import { useState } from "react";
import type { CategoriaSos, SosStatus } from "../../hooks/useCaixa";
import { CheckIcon, LampiaoIcon } from "../icons";
import Botao from "../ui/Botao";
import Modal from "../ui/Modal";

const CATEGORIAS: Array<{ valor: CategoriaSos; rotulo: string }> = [
  { valor: "TROCO", rotulo: "Preciso de troco" },
  { valor: "PROBLEMA_MAQUINA", rotulo: "Problema na máquina" },
  { valor: "MAIS_GENTE", rotulo: "Preciso de reforço" },
  { valor: "CONFUSAO", rotulo: "Confusão no posto" },
];

/**
 * Botão de Pânico de Caixa (backlog do Operador, item 4): lampião fixo no
 * canto — respeitando a safe-area do iOS —, categorias em um toque e
 * confirmação dourada quando a gerência foi acionada.
 */
export default function SosGerencia({
  status,
  onAcionar,
}: {
  status: SosStatus;
  onAcionar: (categoria: CategoriaSos) => void;
}) {
  const [aberto, setAberto] = useState(false);

  function escolher(categoria: CategoriaSos) {
    setAberto(false);
    onAcionar(categoria);
  }

  return (
    <>
      {/* Botão fixo — sempre ao alcance do polegar, acima da barra de gesto */}
      <div className="fixed right-6 z-40 bottom-[max(1.5rem,env(safe-area-inset-bottom))]">
        {status === "acionada" ? (
          <span className="inline-flex min-h-14 items-center gap-2 rounded-lg border border-gold-500/60 bg-wood-800 px-5 font-semibold text-gold-300 shadow-arena">
            <CheckIcon className="h-5 w-5 text-gold-400" />
            Gerência acionada
          </span>
        ) : (
          <Botao
            variante="lampiao"
            tamanho="lg"
            className="shadow-arena"
            carregando={status === "enviando"}
            rotuloCarregando="Acionando..."
            onClick={() => setAberto(true)}
          >
            <LampiaoIcon className="h-5 w-5" />
            SOS Gerência
          </Botao>
        )}
      </div>

      {/* Modal de categorias — superfície sólida com focus trap */}
      {aberto && (
        <Modal titulo="Do que você precisa?" onFechar={() => setAberto(false)}>
          <p className="mt-1 text-leather-300">
            A gerência recebe o alerta na hora, sem você sair do posto.
          </p>

          <div className="mt-6 grid gap-4">
            {CATEGORIAS.map((categoria) => (
              <Botao
                key={categoria.valor}
                variante="couro"
                tamanho="lg"
                className="w-full text-xl"
                onClick={() => escolher(categoria.valor)}
              >
                {categoria.rotulo}
              </Botao>
            ))}
          </div>

          <Botao
            variante="fantasma"
            tamanho="lg"
            className="mt-4 w-full"
            onClick={() => setAberto(false)}
          >
            Cancelar
          </Botao>
        </Modal>
      )}

      {/* Feedback pós-acionamento: o lampião fica aceso até a gerência chegar */}
      {status === "acionada" && (
        <div className="fixed right-6 z-40 max-w-xs rounded-xl border border-gold-500/40 bg-wood-800 px-4 py-3 text-sm text-leather-200 shadow-arena animate-fade-in-up bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+4.5rem)]">
          <span className="flex items-center gap-2">
            <LampiaoIcon className="h-4 w-4 shrink-0 animate-lampiao text-bordo-400" />
            Aguarde no posto — a gerência foi acionada e está a caminho.
          </span>
        </div>
      )}
    </>
  );
}

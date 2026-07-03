import Avatar from "../ui/Avatar";
import Botao from "../ui/Botao";
import SeloCaixa from "../ui/SeloCaixa";
import { AjusteIcon, MaloteIcon } from "../icons";
import type { Operador } from "../../hooks/useGerenciamentoEquipe";

/**
 * Card do operador na tela de equipe: couro padrão (DESIGN-SYSTEM.md §
 * Cards), avatar único do sistema e status via ferradura acesa/apagada.
 */
export default function OperadorCard({
  operador,
  fechando,
  registrandoSangria,
  onFecharCaixa,
  onRegistrarSangria,
  onEditarLimites,
}: {
  operador: Operador;
  fechando: boolean;
  registrandoSangria: boolean;
  onFecharCaixa: (operador: Operador) => void;
  onRegistrarSangria: (operador: Operador) => void;
  onEditarLimites: (operador: Operador) => void;
}) {
  const caixaAberto = operador.statusCaixa === "ABERTO";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-leather-600/40 bg-wood-900 p-5 shadow-arena">
      <div className="flex items-center gap-4">
        <Avatar nome={operador.nome} fotoUrl={operador.fotoUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-leather-200">{operador.nome}</p>
          <p className="truncate text-sm text-steel-400">
            {operador.areaTrabalho || "Área não informada"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEditarLimites(operador)}
          aria-label={`Editar limites de numerário de ${operador.nome}`}
          className="shrink-0 rounded-md p-2 text-steel-400 transition-colors duration-150 ease-couro hover:text-gold-300"
        >
          <AjusteIcon className="h-5 w-5" />
        </button>
      </div>

      <SeloCaixa aberto={caixaAberto} saldoCentavos={operador.saldoAtualCentavos} />

      {caixaAberto ? (
        <div className="grid grid-cols-2 gap-3">
          <Botao
            variante="couro"
            tamanho="md"
            className="w-full"
            carregando={registrandoSangria}
            rotuloCarregando="Recolhendo..."
            onClick={() => onRegistrarSangria(operador)}
          >
            <MaloteIcon className="h-4 w-4" />
            Sangria
          </Botao>
          <Botao
            variante="lampiao"
            tamanho="md"
            className="w-full"
            carregando={fechando}
            rotuloCarregando="Fechando..."
            onClick={() => onFecharCaixa(operador)}
          >
            Fechar Caixa
          </Botao>
        </div>
      ) : (
        <Botao variante="couro" tamanho="md" className="w-full" disabled>
          Nenhum caixa aberto
        </Botao>
      )}
    </div>
  );
}

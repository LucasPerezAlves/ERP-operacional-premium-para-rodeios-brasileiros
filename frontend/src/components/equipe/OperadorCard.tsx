import Avatar from "../ui/Avatar";
import Botao from "../ui/Botao";
import SeloCaixa from "../ui/SeloCaixa";
import type { Operador } from "../../hooks/useGerenciamentoEquipe";

/**
 * Card do operador na tela de equipe: couro padrão (DESIGN-SYSTEM.md §
 * Cards), avatar único do sistema e status via ferradura acesa/apagada.
 */
export default function OperadorCard({
  operador,
  fechando,
  onFecharCaixa,
}: {
  operador: Operador;
  fechando: boolean;
  onFecharCaixa: (operador: Operador) => void;
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
      </div>

      <SeloCaixa aberto={caixaAberto} saldoCentavos={operador.saldoAtualCentavos} />

      {caixaAberto ? (
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
      ) : (
        <Botao variante="couro" tamanho="md" className="w-full" disabled>
          Nenhum caixa aberto
        </Botao>
      )}
    </div>
  );
}

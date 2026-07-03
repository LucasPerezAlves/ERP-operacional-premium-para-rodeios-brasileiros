/**
 * Domínio do SOS Gerência (backlog do Operador item 4 / Master Admin item 1):
 * tipos e rótulos compartilhados entre quem dispara (useCaixa) e quem recebe
 * (useSosAlertas, painel do Admin).
 */

export type CategoriaSos = "TROCO" | "PROBLEMA_MAQUINA" | "MAIS_GENTE" | "CONFUSAO";

const ROTULOS_CATEGORIA_SOS: Record<CategoriaSos, string> = {
  TROCO: "precisa de troco",
  PROBLEMA_MAQUINA: "problema na máquina",
  MAIS_GENTE: "precisa de reforço",
  CONFUSAO: "confusão no posto",
};

export function rotuloCategoriaSos(categoria: CategoriaSos): string {
  return ROTULOS_CATEGORIA_SOS[categoria];
}

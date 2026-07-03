/**
 * Nível de numerário em espécie no caixa (regra de negócio nº 2, revisada):
 * o sistema nunca bloqueia venda — só escala o alerta para a gerência
 * decidir a sangria (regra inegociável nº 7). Espelha o back-end
 * NivelAlertaNumerario.
 */
export type NivelAlertaNumerario = "NORMAL" | "ATENCAO" | "CRITICO";

export function rotuloNivelAlerta(nivel: NivelAlertaNumerario): string {
  switch (nivel) {
    case "CRITICO":
      return "Numerário crítico";
    case "ATENCAO":
      return "Numerário elevado";
    default:
      return "Numerário normal";
  }
}

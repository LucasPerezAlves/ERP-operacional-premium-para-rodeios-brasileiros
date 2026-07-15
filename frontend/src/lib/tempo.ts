/**
 * Formata minutos trabalhados no formato falado do rodeio ("9h30", "0h45"),
 * usado no comprovante de fechamento, Histórico de Turnos e Scorecard.
 */
export function formatarDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  return `${horas}h${minutosRestantes.toString().padStart(2, "0")}`;
}

/** Compara só a data (dia local), ignorando hora — usado nos KPIs "hoje" do Centro de Operações. */
export function ehHoje(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

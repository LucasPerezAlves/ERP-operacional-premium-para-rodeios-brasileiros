/**
 * Todo valor monetário no front-end trafega como CENTAVOS (inteiro) para
 * evitar erros de ponto flutuante em somas (espelho da regra BigDecimal do
 * back-end). A conversão para reais acontece só na borda: exibição e JSON.
 */

const formatadorBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarCentavos(centavos: number): string {
  return formatadorBRL.format(centavos / 100);
}

/** Converte centavos para o número decimal enviado à API (BigDecimal no Java). */
export function centavosParaReais(centavos: number): number {
  return Number((centavos / 100).toFixed(2));
}

/** Converte o decimal vindo da API para centavos inteiros. */
export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

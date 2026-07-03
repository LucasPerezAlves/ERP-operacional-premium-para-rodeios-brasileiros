import { useState } from "react";

/**
 * Generaliza useValorCentavosDigitado (mesma máscara de centavos) para N
 * campos nomeados compartilhando um único teclado on-screen — usado quando
 * o admin alterna entre vários valores (valor global + valor de cada área)
 * sem duplicar o teclado numérico por campo.
 */
export function useCentavosMultiCampo(chaves: string[]) {
  const [valores, setValores] = useState<Record<string, number>>(() => {
    const estadoInicial: Record<string, number> = {};
    for (const chave of chaves) estadoInicial[chave] = 0;
    return estadoInicial;
  });
  const [campoAtivo, setCampoAtivo] = useState<string>(chaves[0]);

  function digitar(tecla: string) {
    if (!/^\d$/.test(tecla)) return;
    setValores((atual) => {
      const proximo = atual[campoAtivo] * 10 + Number(tecla);
      // Trava em ~R$ 999.999,99 — evita overflow de digitação acidental
      return { ...atual, [campoAtivo]: proximo > 99_999_999 ? atual[campoAtivo] : proximo };
    });
  }

  function apagar() {
    setValores((atual) => ({ ...atual, [campoAtivo]: Math.floor(atual[campoAtivo] / 10) }));
  }

  function zerar(chave: string = campoAtivo) {
    setValores((atual) => ({ ...atual, [chave]: 0 }));
  }

  function definirValor(chave: string, centavos: number) {
    setValores((atual) => ({ ...atual, [chave]: centavos }));
  }

  return { valores, campoAtivo, setCampoAtivo, digitar, apagar, zerar, definirValor };
}

import { useState } from "react";

/** Máscara de moeda BR: dígitos digitados se acumulam como centavos (sem parse de vírgula/ponto). */
export function useValorCentavosDigitado() {
  const [centavos, setCentavos] = useState(0);

  function digitar(tecla: string) {
    if (!/^\d$/.test(tecla)) return;
    setCentavos((atual) => {
      const proximo = atual * 10 + Number(tecla);
      // Trava em ~R$ 999.999,99 — evita overflow de digitação acidental
      return proximo > 99_999_999 ? atual : proximo;
    });
  }

  function apagar() {
    setCentavos((atual) => Math.floor(atual / 10));
  }

  return { centavos, digitar, apagar, zerar: () => setCentavos(0) };
}

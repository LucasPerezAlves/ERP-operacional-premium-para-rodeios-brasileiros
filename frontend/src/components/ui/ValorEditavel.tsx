import { useState, type KeyboardEvent } from "react";
import { formatarCentavos } from "../../lib/moeda";
import { useValorCentavosDigitado } from "../../hooks/useValorCentavosDigitado";

/**
 * Valor monetário "toque para digitar": telas com atalhos de cédula/ajuste
 * (Abrir Caixa, Calculadora de Troco) só acumulam múltiplos fixos — este
 * componente permite tocar no total exibido e digitar o valor exato
 * (dígitos ou numpad), dando liberdade para valores quebrados que os
 * atalhos não cobrem. Mesma máscara dos teclados digitados do sistema.
 */
export default function ValorEditavel({
  centavos,
  onAlterar,
  className = "",
}: {
  centavos: number;
  onAlterar: (centavos: number) => void;
  className?: string;
}) {
  const [editando, setEditando] = useState(false);
  const digitado = useValorCentavosDigitado();

  function ativarEdicao() {
    digitado.zerar();
    setEditando(true);
  }

  function confirmar() {
    onAlterar(digitado.centavos);
    setEditando(false);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (/^[0-9]$/.test(evento.key)) {
      evento.preventDefault();
      digitado.digitar(evento.key);
    } else if (evento.key === "Backspace") {
      evento.preventDefault();
      digitado.apagar();
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      confirmar();
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      setEditando(false);
    }
  }

  if (editando) {
    return (
      <input
        type="text"
        inputMode="numeric"
        readOnly
        autoFocus
        value={formatarCentavos(digitado.centavos)}
        onKeyDown={aoTeclar}
        onBlur={confirmar}
        aria-label="Digite o valor exato"
        className={`num-tabular cursor-text border-b-2 border-gold-400 bg-transparent text-center outline-none ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={ativarEdicao}
      aria-label="Tocar para digitar um valor exato"
      title="Tocar para digitar um valor exato"
      className={`num-tabular border-b-2 border-transparent text-center transition-colors duration-150 ease-couro hover:border-gold-400/60 ${className}`}
    >
      {formatarCentavos(centavos)}
    </button>
  );
}

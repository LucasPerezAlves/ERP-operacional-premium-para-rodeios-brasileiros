/** Botão de filtro por área — selo de fivela, mesma linguagem dos badges. */
export default function FiltroArea({
  rotulo,
  ativo,
  onClick,
}: {
  rotulo: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`whitespace-nowrap rounded-md border px-4 py-2 text-sm font-semibold transition-colors duration-150 ease-couro ${
        ativo
          ? "border-gold-500 bg-gold-500/15 text-gold-300"
          : "border-leather-600/50 text-leather-300 hover:border-gold-500 hover:text-gold-300"
      }`}
    >
      {rotulo}
    </button>
  );
}

import { UserIcon } from "../icons";

/**
 * Avatar único do sistema (encerra as 3 implementações divergentes):
 * foto com anel dourado ou fallback rústico de silhueta sobre madeira.
 */
export default function Avatar({
  nome,
  fotoUrl,
  tamanho = "md",
}: {
  nome: string;
  fotoUrl: string | null;
  tamanho?: "md" | "lg";
}) {
  const dimensao = tamanho === "lg" ? "h-16 w-16" : "h-14 w-14";
  const icone = tamanho === "lg" ? "h-7 w-7" : "h-6 w-6";

  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={`Foto de ${nome}`}
        className={`${dimensao} shrink-0 rounded-full object-cover ring-2 ring-gold-500/40`}
      />
    );
  }

  return (
    <span
      className={`${dimensao} flex shrink-0 items-center justify-center rounded-full bg-wood-900 text-leather-400 ring-2 ring-leather-600/40`}
      aria-label={`Sem foto de ${nome}`}
    >
      <UserIcon className={icone} />
    </span>
  );
}

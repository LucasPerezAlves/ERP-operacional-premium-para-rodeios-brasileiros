/**
 * Conjunto único de ícones do sistema (DESIGN-SYSTEM.md § Badges/Selos):
 * SVG próprio, stroke 1.8, currentColor — proibido glifo unicode (✓ → ⌫)
 * e biblioteca externa. Todo símbolo novo entra aqui.
 */

/** Corda de laço girando: círculo de corda aberto com ponta solta. */
export function LassoSpinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} animate-lasso-spin`} aria-hidden>
      <circle
        cx={12}
        cy={12}
        r={8}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="36 14"
      />
      <path
        d="M 18.5 17.5 Q 22 19.5 20.5 22.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Ferradura — status de caixa (acesa/apagada) e sucesso (dourada). */
export function HorseshoeIcon({
  className = "h-12 w-12 text-gold-400",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M7.5 21 C4 16.5 3.5 9.5 7 6 C9.5 3.8 14.5 3.8 17 6 C20.5 9.5 20 16.5 16.5 21"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <circle cx={6.4} cy={12} r={0.9} fill="currentColor" />
      <circle cx={8.2} cy={7.4} r={0.9} fill="currentColor" />
      <circle cx={17.6} cy={12} r={0.9} fill="currentColor" />
      <circle cx={15.8} cy={7.4} r={0.9} fill="currentColor" />
    </svg>
  );
}

/** Silhueta de usuário — campos de nome e fallback de avatar. */
export function UserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx={12} cy={8} r={3.4} stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M4.5 19.5c1.4-3.4 4.4-5.2 7.5-5.2s6.1 1.8 7.5 5.2"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Envelope — campo E-mail. */
export function MailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x={3.5} y={5.5} width={17} height={13} rx={1.6} stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M4.5 6.5 12 12.5l7.5-6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Cadeado — campos de senha. */
export function LockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x={5} y={11} width={14} height={9.5} rx={1.6} stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx={12} cy={15.4} r={1.3} fill="currentColor" />
    </svg>
  );
}

/** Olho aberto — mostrar senha. */
export function EyeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={12} r={2.8} stroke="currentColor" strokeWidth={1.8} />
    </svg>
  );
}

/** Olho riscado — ocultar senha. */
export function EyeOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M3.5 3.5l17 17M9.9 9.9a2.8 2.8 0 0 0 3.9 3.9"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.6C4 8.1 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.7 0 3.2-.5 4.4-1.2M17.9 17.4C19.9 15.9 21.5 12 21.5 12s-1.6-3.1-4.5-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Câmera — captura/upload de foto no cadastro. */
export function CameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={13} r={3.4} stroke="currentColor" strokeWidth={1.8} />
    </svg>
  );
}

/** Crachá — campo Área de Trabalho. */
export function BadgeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x={4} y={5.5} width={16} height={14} rx={2} stroke="currentColor" strokeWidth={1.8} />
      <path d="M9 5.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" stroke="currentColor" strokeWidth={1.8} />
      <circle cx={12} cy={12} r={2.3} stroke="currentColor" strokeWidth={1.8} />
      <path d="M8.5 17c.6-1.6 2-2.5 3.5-2.5s2.9.9 3.5 2.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/** Lupa — campo de busca. */
export function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx={10.5} cy={10.5} r={6.5} stroke="currentColor" strokeWidth={1.8} />
      <path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/** Brasão western — identidade do MASTER_ADMIN (tabela de feedback visual). */
export function BrasaoIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 3l7 2.5v5.5c0 4.6-3 7.6-7 9.5-4-1.9-7-4.9-7-9.5V5.5L12 3z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M12 8l1.1 2.2 2.4.35-1.75 1.7.4 2.4L12 13.5l-2.15 1.15.4-2.4-1.75-1.7 2.4-.35L12 8z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Distintivo de peão — identidade do OPERADOR (tabela de feedback visual). */
export function DistintivoIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx={12} cy={12} r={8.5} stroke="currentColor" strokeWidth={1.8} />
      <circle cx={12} cy={12} r={6.2} stroke="currentColor" strokeWidth={1} opacity={0.5} />
      <path
        d="M12 8.2l1 2 2.2.3-1.6 1.55.35 2.2L12 13.2l-1.95 1.05.35-2.2-1.6-1.55 2.2-.3 1-2z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Lampião — SOS (tabela de feedback visual). */
export function LampiaoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M10 4.5a2 2 0 0 1 4 0V6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M8.5 6.5h7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path
        d="M9.3 6.5l-.9 8.3a3.6 3.6 0 0 0 7.2 0l-.9-8.3"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path d="M9 20.5h6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path
        d="M12 10.2c-1 1.2-1.5 2-1.5 2.9a1.5 1.5 0 0 0 3 0c0-.9-.5-1.7-1.5-2.9z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Placa de arena pendurada — avisos e informações. */
export function PlacaIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 5h16" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M8 5v3M16 5v3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <rect x={5.5} y={8} width={13} height={8.5} rx={1.2} stroke="currentColor" strokeWidth={1.8} />
      <path d="M9 12.2h6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/** Livro-caixa antigo — relatórios e comprovantes. */
export function LivroCaixaIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M6.5 3.5H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17V6a2.5 2.5 0 0 1 2.5-2.5z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20" stroke="currentColor" strokeWidth={1.8} />
      <path d="M9.5 7.5h6M9.5 10.5h6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/** Malote de couro — sangria (tabela de feedback visual). */
export function MaloteIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M9.5 6.5L7 10c-1.9 2-3 4.1-3 6 0 3.1 3.2 5 8 5s8-1.9 8-5c0-1.9-1.1-4-3-6l-2.5-3.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path d="M8.5 6.5h7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M9.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5" stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M12 12.5v4M10.3 13.6h2.6a1.1 1.1 0 0 1 0 2.2h-1.8a1.1 1.1 0 0 0 0 2.2h2.6"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Lâmpada de aviso — indicador de erro (estática, nunca pisca). */
export function LampadaIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M7.5 14a4.5 4.5 0 0 1 9 0"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M6.5 14h11v2.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V14z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M12 5.5v2M6.5 7.5l1.4 1.4M17.5 7.5l-1.4 1.4"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path d="M9 20.5h6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/** Fivela de ajuste — configuração/edição (limiares, preferências). */
export function AjusteIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx={12} cy={12} r={3.2} stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 15.7l-1.7 1.7M17.7 17.7l-1.7-1.7M8 8 6.3 6.3"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Confirmação — substitui o glifo "✓". */
export function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4.5 12.5l5 5L19.5 7"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Seta para a esquerda — links de volta (substitui "←"). */
export function SetaEsquerdaIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Seta para a direita — affordance de navegação (substitui "→"). */
export function SetaDireitaIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Apagar dígito — teclados numéricos (substitui "⌫"). */
export function BackspaceIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M8.5 5H19a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19H8.5L3 12l5.5-7z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M11.5 9.5l5 5M16.5 9.5l-5 5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

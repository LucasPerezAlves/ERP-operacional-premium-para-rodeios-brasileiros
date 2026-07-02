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
      {/* Ponta solta da corda */}
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

/** Ferradura pulsando: estados de sucesso/espera. */
export function HorseshoeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-12 w-12 animate-horseshoe-pulse text-gold-400"
      aria-hidden
    >
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

import { useState, type FormEvent, type ReactNode } from "react";
import {
  configurationError,
  getSupabase,
  isSupabaseConfigured,
} from "../lib/supabase";

// ---------------------------------------------------------------------------
// Tipos do estado de autenticação
// ---------------------------------------------------------------------------

type AuthMode = "login" | "register";

interface UserInfo {
  id: string;
  email: string;
}

type AuthStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  | { kind: "authenticated"; user: UserInfo };

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// ---------------------------------------------------------------------------
// Validação local (antes de qualquer chamada ao Supabase)
// ---------------------------------------------------------------------------

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(
  mode: AuthMode,
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = "Informe o e-mail.";
  } else if (!emailPattern.test(email.trim())) {
    errors.email = "E-mail inválido. Confira o formato (ex: peao@arena.com).";
  }

  if (!password) {
    errors.password = "Informe a senha.";
  } else if (password.length < 6) {
    errors.password = "A senha precisa de pelo menos 6 caracteres.";
  }

  if (mode === "register") {
    if (!fullName.trim()) {
      errors.fullName = "Informe o nome completo do funcionário.";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Confirme a senha.";
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "As senhas não conferem.";
    }
  }

  return errors;
}

/** Traduz mensagens cruas do Supabase para algo claro em português. */
function friendlyError(raw: string): string {
  const contains = (fragment: string) =>
    raw.toLowerCase().includes(fragment.toLowerCase());

  if (contains("Invalid login credentials")) {
    return "E-mail ou senha incorretos. Confira os dados e tente de novo.";
  }
  if (contains("already registered") || contains("already been registered")) {
    return "Este e-mail já está cadastrado. Use a aba Entrar.";
  }
  if (contains("Email not confirmed")) {
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  }
  if (contains("Password should be")) {
    return "A senha não atende aos requisitos mínimos do servidor.";
  }
  if (contains("Failed to fetch") || contains("NetworkError")) {
    return "Sem conexão com a arena. Verifique sua internet e tente novamente.";
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Peças visuais temáticas
// ---------------------------------------------------------------------------

/** Corda de laço girando: círculo de corda aberto com ponta solta. */
function LassoSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-lasso-spin" aria-hidden>
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

/** Ferradura pulsando: estado autenticado. */
function HorseshoeIcon() {
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

/** Partículas de poeira: [left %, tamanho px, atraso s, duração s] */
const dustSpecs: Array<[number, number, number, number]> = [
  [4, 3, 0.0, 13.0],
  [11, 2, 2.5, 16.0],
  [18, 4, 5.0, 12.0],
  [26, 2, 1.2, 18.0],
  [33, 3, 7.4, 14.0],
  [41, 2, 3.8, 17.0],
  [48, 4, 9.0, 13.5],
  [55, 2, 0.6, 15.0],
  [62, 3, 6.2, 12.5],
  [69, 2, 4.4, 18.5],
  [76, 4, 8.1, 14.5],
  [83, 2, 2.0, 16.5],
  [90, 3, 10.3, 13.0],
  [95, 2, 5.6, 17.5],
];

/** Fundo da arena: gradiente escuro, holofote oscilando e poeira subindo. */
function ArenaBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Gradiente base: madeira profunda com centro levemente aquecido */}
      <div className="absolute inset-0 bg-gradient-to-b from-wood-950 via-wood-900 to-wood-950" />
      {/* Holofote oscilando sobre a arena */}
      <div className="absolute inset-0 animate-spotlight-flicker bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgba(212,175,55,0.14),transparent_70%)]" />
      {/* Vinheta lateral para afunilar o olhar no cartão */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_60%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      {/* Poeira da arena subindo lentamente */}
      <div className="absolute inset-0">
        {dustSpecs.map(([left, size, delay, duration], index) => (
          <span
            key={index}
            className="absolute bottom-0 rounded-full bg-gold-200/50 animate-dust-rise"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componentes de formulário
// ---------------------------------------------------------------------------

function inputClass(hasError: boolean): string {
  const border = hasError
    ? "border-rust-400 focus:border-rust-300 focus:ring-rust-400/40"
    : "border-leather-600/60 focus:border-gold-400 focus:ring-gold-400/30";

  return (
    "w-full rounded-lg border bg-wood-900/80 px-4 py-3 text-amber-50 " +
    "placeholder-leather-400/50 outline-none ring-0 transition-colors " +
    "duration-200 focus:ring-4 " +
    border
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-rust-300">
      {error}
    </p>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function TextField({
  id,
  label,
  type,
  autoComplete,
  placeholder,
  value,
  error,
  onChange,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-leather-200">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass(Boolean(error))}
      />
      <FieldError error={error} />
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  visible: boolean;
  error?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  visible,
  error,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-leather-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass(Boolean(error)) + " pr-20"}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 px-4 text-xs font-semibold uppercase tracking-wider text-gold-300 transition-colors hover:text-gold-200"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <FieldError error={error} />
    </div>
  );
}

function SubmitButton({ label, isLoading }: { label: string; isLoading: boolean }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="mt-2 flex w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-b from-gold-400 to-gold-600 px-4 py-3.5 font-display text-sm uppercase tracking-widest text-wood-950 shadow-spotlight transition-all duration-200 hover:from-gold-300 hover:to-gold-500 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? (
        <>
          <LassoSpinner />
          <span>Laçando...</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

/**
 * Painéis empilhados na mesma célula do grid; o inativo desliza para fora no
 * eixo X com fade — transição SPA fluida, sem remontagem nem recarga.
 */
function panelClass(isActive: boolean, slideFrom: string): string {
  const visibility = isActive
    ? "opacity-100 translate-x-0"
    : `opacity-0 ${slideFrom} pointer-events-none`;

  return `col-start-1 row-start-1 transition-all duration-500 ease-out ${visibility}`;
}

/** Alternador Entrar/Cadastro com pílula dourada deslizante. */
function ModeSwitcher({
  mode,
  onSwitch,
}: {
  mode: AuthMode;
  onSwitch: (mode: AuthMode) => void;
}) {
  const pillPosition = mode === "login" ? "translate-x-0" : "translate-x-full";

  const tabClass = (isActive: boolean) => {
    const color = isActive
      ? "text-wood-950"
      : "text-leather-300 hover:text-gold-200";
    return `relative z-10 rounded-md py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors duration-300 ${color}`;
  };

  return (
    <div className="relative mb-8 grid grid-cols-2 rounded-lg border border-leather-600/40 bg-wood-900/70 p-1">
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-gradient-to-b from-gold-400 to-gold-600 shadow-spotlight transition-transform duration-300 ease-out ${pillPosition}`}
      />
      <button type="button" className={tabClass(mode === "login")} onClick={() => onSwitch("login")}>
        Entrar
      </button>
      <button type="button" className={tabClass(mode === "register")} onClick={() => onSwitch("register")}>
        Cadastro
      </button>
    </div>
  );
}

/** Estado autenticado: porteira aberta. */
function AuthenticatedView({ user }: { user: UserInfo }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center animate-fade-in-up">
      <HorseshoeIcon />
      <h2 className="font-display text-2xl text-gold-300">Porteira aberta!</h2>
      <p className="text-leather-200">
        Bem-vindo à arena,{" "}
        <span className="font-semibold text-gold-200">{user.email}</span>.
      </p>
      <p className="text-sm text-leather-400">
        Se este for um cadastro novo, confirme o e-mail antes do primeiro login.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página de autenticação
// ---------------------------------------------------------------------------

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<AuthStatus>({ kind: "idle" });

  const isLoading = status.kind === "loading";

  function switchMode(next: AuthMode) {
    setMode(next);
    setStatus({ kind: "idle" });
    setErrors({});
    setConfirmPassword("");
  }

  function clearFieldError(field: keyof FieldErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validationErrors = validate(mode, fullName, email, password, confirmPassword);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }

    if (!isSupabaseConfigured) {
      setStatus({ kind: "failed", message: configurationError });
      return;
    }

    setStatus({ kind: "loading" });
    setErrors({});

    try {
      const supabase = getSupabase();
      const credentials = { email: email.trim(), password };

      const { data, error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp({
              ...credentials,
              options: { data: { full_name: fullName.trim() } },
            });

      if (error) {
        setStatus({ kind: "failed", message: friendlyError(error.message) });
        return;
      }

      if (!data.user) {
        setStatus({
          kind: "failed",
          message: "Resposta inesperada do servidor: usuário não retornado.",
        });
        return;
      }

      setStatus({
        kind: "authenticated",
        user: { id: data.user.id, email: data.user.email ?? "" },
      });
      setPassword("");
      setConfirmPassword("");
    } catch (exception) {
      const message =
        exception instanceof Error ? exception.message : String(exception);
      setStatus({ kind: "failed", message: friendlyError(message) });
    }
  }

  let cardContent: ReactNode;

  if (status.kind === "authenticated") {
    cardContent = <AuthenticatedView user={status.user} />;
  } else {
    cardContent = (
      <>
        <ModeSwitcher mode={mode} onSwitch={switchMode} />

        {status.kind === "failed" && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-rust-500/60 bg-rust-600/15 px-4 py-3 text-sm text-rust-300 animate-fade-in-up"
          >
            {status.message}
          </div>
        )}

        <div className="grid">
          {/* Painel: Login */}
          <form
            className={`${panelClass(mode === "login", "-translate-x-10")} flex flex-col justify-center gap-5`}
            aria-hidden={mode !== "login"}
            onSubmit={handleSubmit}
          >
            <TextField
              id="login-email"
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="peao@arena.com"
              value={email}
              error={errors.email}
              onChange={(value) => {
                setEmail(value);
                clearFieldError("email");
              }}
            />
            <PasswordField
              id="login-password"
              label="Senha"
              autoComplete="current-password"
              value={password}
              visible={passwordVisible}
              error={errors.password}
              onChange={(value) => {
                setPassword(value);
                clearFieldError("password");
              }}
              onToggle={() => setPasswordVisible((visible) => !visible)}
            />
            <SubmitButton label="Entrar na Arena" isLoading={isLoading} />
          </form>

          {/* Painel: Cadastro */}
          <form
            className={`${panelClass(mode === "register", "translate-x-10")} flex flex-col gap-5`}
            aria-hidden={mode !== "register"}
            onSubmit={handleSubmit}
          >
            <TextField
              id="register-name"
              label="Nome completo"
              type="text"
              autoComplete="name"
              placeholder="Nome do funcionário"
              value={fullName}
              error={errors.fullName}
              onChange={(value) => {
                setFullName(value);
                clearFieldError("fullName");
              }}
            />
            <TextField
              id="register-email"
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="peao@arena.com"
              value={email}
              error={errors.email}
              onChange={(value) => {
                setEmail(value);
                clearFieldError("email");
              }}
            />
            <PasswordField
              id="register-password"
              label="Senha"
              autoComplete="new-password"
              value={password}
              visible={passwordVisible}
              error={errors.password}
              onChange={(value) => {
                setPassword(value);
                clearFieldError("password");
              }}
              onToggle={() => setPasswordVisible((visible) => !visible)}
            />
            <PasswordField
              id="register-confirm"
              label="Confirmar senha"
              autoComplete="new-password"
              value={confirmPassword}
              visible={passwordVisible}
              error={errors.confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                clearFieldError("confirmPassword");
              }}
              onToggle={() => setPasswordVisible((visible) => !visible)}
            />
            <SubmitButton label="Registrar Peão" isLoading={isLoading} />
          </form>
        </div>
      </>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-wood-950 px-4 py-10 font-sans text-amber-50">
      <ArenaBackground />

      <main className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Cabeçalho da marca */}
        <header className="mb-8 text-center">
          <h1 className="font-display text-4xl tracking-wide text-gold-400 drop-shadow-[0_2px_12px_rgba(212,175,55,0.35)]">
            CONTROLE DA ARENA
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-leather-300">
            Gestão Financeira de Rodeio
          </p>
        </header>

        {/* Cartão de couro */}
        <div className="rounded-2xl border border-leather-600/50 bg-wood-800/90 p-8 shadow-arena backdrop-blur-sm">
          {cardContent}
        </div>

        <footer className="mt-6 text-center text-xs text-leather-400/70">
          Acesso restrito à equipe do evento.
        </footer>
      </main>
    </div>
  );
}

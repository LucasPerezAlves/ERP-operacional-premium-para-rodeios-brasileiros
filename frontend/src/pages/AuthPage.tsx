import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  configurationError,
  getSupabase,
  isSupabaseConfigured,
} from "../lib/supabase";
import { rotaDoPerfil, useAuth, type PerfilAcesso } from "../lib/auth";
import { enviarFotoCadastro } from "../lib/upload";
import {
  BadgeIcon,
  CameraIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "../components/icons";
import Alerta from "../components/ui/Alerta";
import Botao from "../components/ui/Botao";
import { SucessoOperacional } from "../components/ui/interacoes";

/** Postos do evento — usados pelo Admin para localizar o operador (backlog). */
const AREAS_TRABALHO = [
  "Bar de Fora",
  "Bar Interno",
  "Portaria",
  "Estacionamento",
  "Bilheteria",
  "Cozinha",
  "Segurança",
] as const;

// ---------------------------------------------------------------------------
// Tipos do estado de autenticação (lógica intacta)
// ---------------------------------------------------------------------------

type AuthMode = "login" | "register";

type AuthStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  // Cadastro enviado, aguardando Aprovação de Gerência
  | { kind: "registered" };

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  areaTrabalho?: string;
  foto?: string;
}

// ---------------------------------------------------------------------------
// Validação local (antes de qualquer chamada ao Supabase) — inalterada
// ---------------------------------------------------------------------------

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(
  mode: AuthMode,
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
  areaTrabalho: string,
  foto: File | null,
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
    if (!areaTrabalho) {
      errors.areaTrabalho = "Selecione a área de trabalho.";
    }
    if (!foto) {
      errors.foto = "A foto é obrigatória para identificação pela gerência.";
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
// Atmosfera: madeira de arena + ruído orgânico via filtro SVG + poeira
// ---------------------------------------------------------------------------

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

/**
 * Filtro SVG de ruído orgânico (feTurbulence + feColorMatrix), tingido em
 * âmbar para simular grão de couro cru sob o holofote. Definido uma vez,
 * referenciado via CSS `filter: url(#id)` — id único por instância via
 * useId() para não colidir se a página remontar.
 */
function GrainFilterDefs({ filterId }: { filterId: string }) {
  return (
    <svg className="absolute h-0 w-0 overflow-hidden" aria-hidden focusable="false">
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={2}
            stitchTiles="stitch"
            result="grain"
          />
          {/* Zera RGB para um tom âmbar fixo e deriva o alpha da luminância do ruído */}
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0.55
                    0 0 0 0 0.38
                    0 0 0 0 0.16
                    0.2126 0.7152 0.0722 0 0"
          />
        </filter>
      </defs>
    </svg>
  );
}

function ArenaBackdrop({ filterId }: { filterId: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base: madeira profunda da arena, sem preto puro */}
      <div className="absolute inset-0 bg-gradient-to-b from-arena-900 via-arena-950 to-arena-950" />
      {/* Holofote quente oscilando sobre a arena */}
      <div className="absolute inset-0 animate-spotlight-flicker bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgba(212,175,55,0.14),transparent_70%)]" />
      {/* Vinheta lateral para afunilar o olhar no cartão */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_60%,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
      {/* Textura de ruído orgânico (couro cru / poeira), opacidade via CSS var */}
      <div
        className="animate-grain-drift absolute inset-0 mix-blend-overlay opacity-[var(--grain-opacity)]"
        style={{ filter: `url(#${filterId})`, "--grain-opacity": 0.07 } as CSSProperties}
      />
      {/* Poeira da arena subindo muito lentamente */}
      <div className="absolute inset-0">
        {dustSpecs.map(([left, size, delay, duration], index) => (
          <span
            key={index}
            className="absolute bottom-0 rounded-full bg-gold-200/40 animate-dust-rise"
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
// Input flutuante: sem bordas laterais/superiores, apenas fio inferior
// espesso que "acende" em dourado no foco ou quando preenchido, com label
// físico (cubic-bezier customizado) e ícone SVG à esquerda.
// (Exceção documentada no DESIGN-SYSTEM.md: floating label só nesta página.)
// ---------------------------------------------------------------------------

const FLOATING_LABEL_CLASS =
  "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[15px] " +
  "text-steel-400 transition-all duration-300 ease-label " +
  "peer-focus:top-0 peer-focus:-translate-y-[135%] peer-focus:text-xs " +
  "peer-focus:tracking-wide peer-focus:text-gold-400 " +
  "peer-[&:not(:placeholder-shown)]:top-0 " +
  "peer-[&:not(:placeholder-shown)]:-translate-y-[135%] " +
  "peer-[&:not(:placeholder-shown)]:text-xs " +
  "peer-[&:not(:placeholder-shown)]:tracking-wide " +
  "peer-[&:not(:placeholder-shown)]:text-gold-400";

interface FloatingInputProps {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  error?: string;
  icon: ReactNode;
  onChange: (value: string) => void;
  /** Slot extra à direita (usado pelo botão de mostrar/ocultar senha). */
  rightSlot?: ReactNode;
}

function FloatingInput({
  id,
  label,
  type,
  autoComplete,
  value,
  error,
  icon,
  onChange,
  rightSlot,
}: FloatingInputProps) {
  const borderTone = error
    ? "border-rust-500 has-[:focus]:border-rust-400"
    : "border-leather-700 focus-within:border-gold-500 has-[:not(:placeholder-shown)]:border-gold-600/80";

  const iconTone = error
    ? "text-rust-400"
    : "text-steel-500 transition-colors duration-300 group-focus-within:text-gold-400 group-has-[:not(:placeholder-shown)]:text-gold-400";

  return (
    <div>
      <div
        className={`group relative flex items-end gap-3 border-b-2 pb-2 transition-colors duration-300 ease-label ${borderTone}`}
      >
        <span className={`mb-0.5 shrink-0 ${iconTone}`}>{icon}</span>

        <div className="relative flex-1">
          <input
            id={id}
            type={type}
            autoComplete={autoComplete}
            placeholder=" "
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="peer w-full bg-transparent pb-1 pt-5 text-[15px] text-leather-200 outline-none placeholder-transparent"
          />
          <label htmlFor={id} className={FLOATING_LABEL_CLASS}>
            {label}
          </label>
        </div>

        {rightSlot && <div className="mb-0.5 shrink-0">{rightSlot}</div>}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-rust-300">
          {error}
        </p>
      )}
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
  onToggleVisible: () => void;
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  visible,
  error,
  onChange,
  onToggleVisible,
}: PasswordFieldProps) {
  return (
    <FloatingInput
      id={id}
      label={label}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      value={value}
      error={error}
      icon={<LockIcon />}
      onChange={onChange}
      rightSlot={
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="text-steel-500 transition-colors duration-200 hover:text-gold-400"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  error?: string;
  onChange: (value: string) => void;
}

/** Select de Área de Trabalho — mesma borda inferior dourada dos demais campos. */
function SelectField({ id, label, value, options, error, onChange }: SelectFieldProps) {
  const borderTone = error
    ? "border-rust-500"
    : "border-leather-700 focus-within:border-gold-500 has-[:valid]:border-gold-600/80";

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-steel-400">
        {label}
      </label>
      <div
        className={`flex items-center gap-3 border-b-2 pb-2 transition-colors duration-300 ease-label ${borderTone}`}
      >
        <span className="shrink-0 text-steel-500">
          <BadgeIcon />
        </span>
        <select
          id={id}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none bg-transparent pb-1 pt-1 text-[15px] text-leather-200 outline-none [color-scheme:dark]"
        >
          <option value="" disabled className="bg-wood-900">
            Selecione...
          </option>
          {options.map((area) => (
            <option key={area} value={area} className="bg-wood-900">
              {area}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-rust-300">
          {error}
        </p>
      )}
    </div>
  );
}

interface FotoFieldProps {
  arquivo: File | null;
  error?: string;
  onChange: (arquivo: File | null) => void;
}

/** Captura por câmera ou upload de arquivo, com miniatura de prévia. */
function FotoField({ arquivo, error, onChange }: FotoFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Blob URL criado uma vez por arquivo e sempre revogado — nunca no render
  useEffect(() => {
    if (!arquivo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(arquivo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  return (
    <div>
      <label className="mb-1 block text-xs text-steel-400">Foto do funcionário</label>
      <label
        htmlFor="register-foto"
        className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed px-4 py-3 transition-colors duration-200 ${
          error ? "border-rust-500" : "border-leather-700 hover:border-gold-500"
        }`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Prévia da foto enviada"
            className="h-14 w-14 rounded-full object-cover ring-2 ring-gold-500/50"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-wood-800 text-steel-500">
            <CameraIcon className="h-6 w-6" />
          </span>
        )}
        <span className="text-sm text-leather-300">
          {arquivo ? arquivo.name : "Tirar foto ou escolher arquivo"}
        </span>
        <input
          id="register-foto"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-rust-300">
          {error}
        </p>
      )}
    </div>
  );
}

/** Alternador Entrar/Cadastro com pílula dourada deslizante — dispara o flip. */
function ModeSwitcher({
  mode,
  onSwitch,
}: {
  mode: AuthMode;
  onSwitch: (mode: AuthMode) => void;
}) {
  const pillPosition = mode === "login" ? "translate-x-0" : "translate-x-full";

  const tabClass = (isActive: boolean) => {
    const color = isActive ? "text-wood-950" : "text-leather-400 hover:text-gold-300";
    return `relative z-10 rounded-md py-2.5 text-sm font-semibold transition-colors duration-300 ${color}`;
  };

  return (
    <div className="relative mb-8 grid grid-cols-2 rounded-lg border border-leather-700/80 bg-arena-950/80 p-1">
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-gradient-to-b from-gold-400 to-gold-600 shadow-spotlight transition-transform duration-300 ease-label ${pillPosition}`}
      />
      <button
        type="button"
        aria-pressed={mode === "login"}
        className={tabClass(mode === "login")}
        onClick={() => onSwitch("login")}
      >
        Entrar
      </button>
      <button
        type="button"
        aria-pressed={mode === "register"}
        className={tabClass(mode === "register")}
        onClick={() => onSwitch("register")}
      >
        Cadastro
      </button>
    </div>
  );
}

/** Pós-cadastro: aguardando a Aprovação de Gerência. */
function RegisteredView({ onBackToLogin }: { onBackToLogin: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <SucessoOperacional titulo="Cadastro enviado!">
        <p className="mt-2 text-leather-300">Aguarde a gerência aprovar sua entrada na arena.</p>
        <p className="mt-1 text-sm text-steel-400">
          Você poderá entrar assim que a porteira for liberada.
        </p>
      </SucessoOperacional>
      <Botao variante="couro" tamanho="lg" className="mt-2" onClick={onBackToLogin}>
        Voltar para o Login
      </Botao>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom hook: gerencia a classe que engatilha a rotação 3D do container.
// Login (frente) e Cadastro (verso) permanecem sempre montados no DOM; o
// hook só decide para que lado o "cartão de couro" está virado.
// ---------------------------------------------------------------------------

interface AuthFormTransition {
  isFlipped: boolean;
  /** Classe utilitária (arbitrary value) que gira o container em Y. */
  rotationClass: string;
}

function useAuthFormTransition(mode: AuthMode): AuthFormTransition {
  const isFlipped = mode === "register";
  return {
    isFlipped,
    rotationClass: isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]",
  };
}

// ---------------------------------------------------------------------------
// Página de autenticação
// ---------------------------------------------------------------------------

export default function AuthPage() {
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const grainFilterId = useId().replace(/:/g, "");

  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [areaTrabalho, setAreaTrabalho] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<AuthStatus>({ kind: "idle" });

  const { isFlipped, rotationClass } = useAuthFormTransition(mode);
  const isLoading = status.kind === "loading";

  // Sessão já ativa e aprovada (ex.: F5 ou retorno ao site) → direto ao painel
  useEffect(() => {
    if (perfil && perfil.statusAprovacao === "APROVADO") {
      navigate(rotaDoPerfil(perfil.perfilAcesso), { replace: true });
    }
  }, [perfil, navigate]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setStatus({ kind: "idle" });
    setErrors({});
    setConfirmPassword("");
    setAreaTrabalho("");
    setFoto(null);
  }

  function clearFieldError(field: keyof FieldErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validationErrors = validate(
      mode,
      fullName,
      email,
      password,
      confirmPassword,
      areaTrabalho,
      foto,
    );
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

      if (mode === "register") {
        // Foto sobe ANTES do signUp (usuário ainda anônimo) — a URL entra
        // nos metadados e a trigger do banco copia para o perfil na criação.
        let fotoUrl: string;
        try {
          fotoUrl = await enviarFotoCadastro(foto as File);
        } catch (excecaoFoto) {
          const mensagem =
            excecaoFoto instanceof Error ? excecaoFoto.message : "Falha ao enviar a foto.";
          setStatus({ kind: "failed", message: mensagem });
          return;
        }

        const { error } = await supabase.auth.signUp({
          ...credentials,
          options: {
            data: {
              full_name: fullName.trim(),
              area_trabalho: areaTrabalho,
              foto_url: fotoUrl,
            },
          },
        });

        if (error) {
          setStatus({ kind: "failed", message: friendlyError(error.message) });
          return;
        }

        // Mesmo que o Supabase abra sessão no cadastro, o acesso só vale
        // após a Aprovação de Gerência — garante que ninguém fica logado.
        await supabase.auth.signOut();
        setStatus({ kind: "registered" });
        setPassword("");
        setConfirmPassword("");
        setAreaTrabalho("");
        setFoto(null);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword(credentials);

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

      // Senha correta não basta: o perfil precisa estar APROVADO pela gerência.
      const { data: dadosPerfil, error: perfilError } = await supabase
        .from("perfis_funcionarios")
        .select("status_aprovacao, perfil_acesso")
        .eq("id", data.user.id)
        .single();

      const statusAprovacao: string | undefined = dadosPerfil?.status_aprovacao;

      if (perfilError || statusAprovacao !== "APROVADO") {
        await supabase.auth.signOut();
        setStatus({
          kind: "failed",
          message:
            statusAprovacao === "REJEITADO"
              ? "Seu cadastro foi recusado pela gerência."
              : "Sua entrada ainda não foi autorizada pela gerência.",
        });
        return;
      }

      // RBAC: cada nível de acesso tem o seu painel.
      const perfilAcesso = (dadosPerfil?.perfil_acesso ?? "OPERADOR") as PerfilAcesso;
      setPassword("");
      setConfirmPassword("");
      navigate(rotaDoPerfil(perfilAcesso), { replace: true });
    } catch (exception) {
      const message =
        exception instanceof Error ? exception.message : String(exception);
      setStatus({ kind: "failed", message: friendlyError(message) });
    }
  }

  let cardContent: ReactNode;

  if (status.kind === "registered") {
    cardContent = <RegisteredView onBackToLogin={() => switchMode("login")} />;
  } else {
    cardContent = (
      <>
        <ModeSwitcher mode={mode} onSwitch={switchMode} />

        {status.kind === "failed" && (
          <Alerta tipo="erro" className="mb-5">
            {status.message}
          </Alerta>
        )}

        {/* Palco de perspectiva 3D — o filho abaixo é o que efetivamente gira */}
        <div className="[perspective:1600px]">
          <div
            className={`auth-flip-container grid transition-transform duration-700 ease-heavy [transform-style:preserve-3d] ${rotationClass}`}
          >
            {/* Face frontal: Login. Formulários coexistem no DOM; o inativo
                vira <fieldset disabled> — inacessível a teclado/leitor de tela
                e fora da ordem de tabulação, sem sair da árvore do documento. */}
            <form
              className="col-start-1 row-start-1 flex flex-col justify-center gap-6 [backface-visibility:hidden]"
              onSubmit={handleSubmit}
              aria-hidden={isFlipped}
            >
              <fieldset disabled={isFlipped} className="contents border-0 p-0">
                <FloatingInput
                  id="login-email"
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  error={errors.email}
                  icon={<MailIcon />}
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
                  onToggleVisible={() => setPasswordVisible((visible) => !visible)}
                />
                <Botao
                  type="submit"
                  variante="latao"
                  tamanho="lg"
                  className="mt-2 w-full font-display text-sm tracking-widest"
                  carregando={isLoading && !isFlipped}
                >
                  Entrar na Arena
                </Botao>
              </fieldset>
            </form>

            {/* Face traseira: Cadastro. Pré-girada 180° para compensar a
                rotação do container e ficar legível quando exposta. */}
            <form
              className="col-start-1 row-start-1 flex flex-col gap-6 [backface-visibility:hidden] [transform:rotateY(180deg)]"
              onSubmit={handleSubmit}
              aria-hidden={!isFlipped}
            >
              <fieldset disabled={!isFlipped} className="contents border-0 p-0">
                <FloatingInput
                  id="register-name"
                  label="Nome completo"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  error={errors.fullName}
                  icon={<UserIcon />}
                  onChange={(value) => {
                    setFullName(value);
                    clearFieldError("fullName");
                  }}
                />
                <FloatingInput
                  id="register-email"
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  value={email}
                  error={errors.email}
                  icon={<MailIcon />}
                  onChange={(value) => {
                    setEmail(value);
                    clearFieldError("email");
                  }}
                />
                <SelectField
                  id="register-area"
                  label="Área de trabalho"
                  value={areaTrabalho}
                  options={AREAS_TRABALHO}
                  error={errors.areaTrabalho}
                  onChange={(value) => {
                    setAreaTrabalho(value);
                    clearFieldError("areaTrabalho");
                  }}
                />
                <FotoField
                  arquivo={foto}
                  error={errors.foto}
                  onChange={(arquivo) => {
                    setFoto(arquivo);
                    clearFieldError("foto");
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
                  onToggleVisible={() => setPasswordVisible((visible) => !visible)}
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
                  onToggleVisible={() => setPasswordVisible((visible) => !visible)}
                />
                <Botao
                  type="submit"
                  variante="latao"
                  tamanho="lg"
                  className="mt-2 w-full font-display text-sm tracking-widest"
                  carregando={isLoading && isFlipped}
                >
                  Registrar Peão
                </Botao>
              </fieldset>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-arena-950 px-4 py-10 font-sans text-leather-200">
      <GrainFilterDefs filterId={grainFilterId} />
      <ArenaBackdrop filterId={grainFilterId} />

      <main className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Cabeçalho da marca */}
        <header className="mb-8 text-center">
          <h1 className="font-display text-4xl tracking-wide text-gold-400 drop-shadow-[0_2px_16px_rgba(212,175,55,0.4)]">
            CONTROLE DA ARENA
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-leather-400">
            Gestão Financeira de Rodeio
          </p>
        </header>

        {/* Cartão "Porteira": madeira sólida com borda metálica desgastada
            (dívida de glassmorphism quitada — superfície 100% opaca) */}
        <div className="shadow-porteira rounded-xl border border-leather-600/50 bg-wood-900 p-8">
          {cardContent}
        </div>

        <footer className="mt-6 text-center text-xs text-leather-400">
          Acesso restrito à equipe do evento.
        </footer>
      </main>
    </div>
  );
}

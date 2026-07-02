/**
 * Feedback auditivo do PDV (backlog do Operador, item 2): venda concluída
 * emite um "bip" curto e metálico; erro emite um tom grave e mais longo.
 *
 * Implementado com a Web Audio API nativa (síntese em tempo real) em vez de
 * arquivos base64: zero payload, som garantidamente válido em qualquer
 * navegador e sem asset externo. Toda chamada é fail-safe — em ambiente sem
 * áudio (autoplay bloqueado, tablet mudo), a venda nunca é interrompida.
 */

let contexto: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return null;
  }
  if (!contexto) {
    contexto = new AudioContext();
  }
  // Navegadores suspendem o contexto até a primeira interação do usuário;
  // como os sons sempre seguem um toque no botão, o resume() destrava.
  if (contexto.state === "suspended") {
    void contexto.resume();
  }
  return contexto;
}

function tocarNota(
  ctx: AudioContext,
  tipo: OscillatorType,
  frequencia: number,
  inicio: number,
  duracao: number,
  volume: number,
) {
  const oscilador = ctx.createOscillator();
  const ganho = ctx.createGain();

  oscilador.type = tipo;
  oscilador.frequency.setValueAtTime(frequencia, inicio);

  // Envelope percussivo: ataque imediato, decaimento exponencial (som "seco")
  ganho.gain.setValueAtTime(volume, inicio);
  ganho.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);

  oscilador.connect(ganho);
  ganho.connect(ctx.destination);
  oscilador.start(inicio);
  oscilador.stop(inicio + duracao);
}

/** Estalo metálico curto e agudo: venda registrada com sucesso. */
export function tocarSucesso(): void {
  try {
    const ctx = obterContexto();
    if (!ctx) return;
    const agora = ctx.currentTime;
    // Duas notas rápidas ascendentes = "caixa registradora"
    tocarNota(ctx, "triangle", 1320, agora, 0.09, 0.4);
    tocarNota(ctx, "triangle", 1980, agora + 0.09, 0.12, 0.35);
  } catch {
    // Áudio indisponível: segue o fluxo em silêncio
  }
}

/** Tom grave e longo: falha ao registrar a operação. */
export function tocarErro(): void {
  try {
    const ctx = obterContexto();
    if (!ctx) return;
    const agora = ctx.currentTime;
    tocarNota(ctx, "sawtooth", 165, agora, 0.45, 0.35);
    tocarNota(ctx, "sawtooth", 110, agora + 0.12, 0.4, 0.3);
  } catch {
    // Áudio indisponível: segue o fluxo em silêncio
  }
}

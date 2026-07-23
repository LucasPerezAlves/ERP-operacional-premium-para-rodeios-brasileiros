import { useState } from "react";
import Modal from "../ui/Modal";
import Botao from "../ui/Botao";
import type { DadosEvento } from "../../lib/api";
import type { Evento } from "../../hooks/useEventos";

const CAMPO_TEXTO =
  "w-full rounded-lg border border-leather-500/50 bg-wood-900 p-2.5 text-[14px] text-leather-200 outline-none transition-colors duration-200 placeholder:text-leather-400/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/20";
const RUBRICA = "mb-1.5 block text-[13px] font-medium text-leather-200";

/**
 * Cadastro/edição de Evento — formulário simples (Sprint 1: validar a
 * arquitetura do domínio, sem investimento de UX refinada ainda). Sem
 * campo de status: status só muda pelas ações da tela (Publicar,
 * Encerrar...). Slug é gerado pelo back-end, nunca editado aqui.
 */
export default function EventoModal({
  evento,
  salvando,
  onConfirmar,
  onCancelar,
}: {
  evento: Evento | null;
  salvando: boolean;
  onConfirmar: (dados: DadosEvento) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(evento?.nome ?? "");
  const [local, setLocal] = useState(evento?.local ?? "");
  const [cidade, setCidade] = useState(evento?.cidade ?? "");
  const [estado, setEstado] = useState(evento?.estado ?? "");
  const [endereco, setEndereco] = useState(evento?.endereco ?? "");
  const [dataInicio, setDataInicio] = useState(evento?.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(evento?.dataFim ?? "");
  const [horarioAbertura, setHorarioAbertura] = useState(evento?.horarioAbertura?.slice(0, 5) ?? "");
  const [capacidade, setCapacidade] = useState(evento?.capacidade?.toString() ?? "");
  const [organizador, setOrganizador] = useState(evento?.organizador ?? "");
  const [descricaoCurta, setDescricaoCurta] = useState(evento?.descricaoCurta ?? "");
  const [descricaoCompleta, setDescricaoCompleta] = useState(evento?.descricaoCompleta ?? "");
  const [bannerUrl, setBannerUrl] = useState(evento?.bannerUrl ?? "");
  const [imagemDestaqueUrl, setImagemDestaqueUrl] = useState(evento?.imagemDestaqueUrl ?? "");
  const [observacoes, setObservacoes] = useState(evento?.observacoes ?? "");

  const podeConfirmar =
    nome.trim().length > 0 && dataInicio.length > 0 && dataFim.length > 0 && !salvando;

  function confirmar() {
    if (!podeConfirmar) return;
    onConfirmar({
      nome: nome.trim(),
      descricaoCurta: descricaoCurta.trim() || null,
      descricaoCompleta: descricaoCompleta.trim() || null,
      bannerUrl: bannerUrl.trim() || null,
      imagemDestaqueUrl: imagemDestaqueUrl.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado.trim() || null,
      endereco: endereco.trim() || null,
      local: local.trim() || null,
      dataInicio,
      dataFim,
      horarioAbertura: horarioAbertura || null,
      capacidade: capacidade ? Number(capacidade) : null,
      organizador: organizador.trim() || null,
      observacoes: observacoes.trim() || null,
    });
  }

  return (
    <Modal titulo={evento ? "Editar evento" : "Novo evento"} onFechar={onCancelar} larguraMax="max-w-2xl">
      <div className="mt-4 max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label className={RUBRICA} htmlFor="evento-nome">Nome</label>
          <input
            id="evento-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Rodeio de Outono 2026"
            className={CAMPO_TEXTO}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={RUBRICA} htmlFor="evento-data-inicio">Data de início</label>
            <input
              id="evento-data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className={CAMPO_TEXTO}
            />
          </div>
          <div>
            <label className={RUBRICA} htmlFor="evento-data-fim">Data de término</label>
            <input
              id="evento-data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className={CAMPO_TEXTO}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={RUBRICA} htmlFor="evento-horario">Horário de abertura</label>
            <input
              id="evento-horario"
              type="time"
              value={horarioAbertura}
              onChange={(e) => setHorarioAbertura(e.target.value)}
              className={CAMPO_TEXTO}
            />
          </div>
          <div>
            <label className={RUBRICA} htmlFor="evento-capacidade">Capacidade</label>
            <input
              id="evento-capacidade"
              type="number"
              min={1}
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              placeholder="Opcional"
              className={CAMPO_TEXTO}
            />
          </div>
        </div>

        <div>
          <label className={RUBRICA} htmlFor="evento-local">Local</label>
          <input
            id="evento-local"
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex.: Parque de Exposições"
            className={CAMPO_TEXTO}
          />
        </div>

        <div>
          <label className={RUBRICA} htmlFor="evento-endereco">Endereço</label>
          <input
            id="evento-endereco"
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className={CAMPO_TEXTO}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={RUBRICA} htmlFor="evento-cidade">Cidade</label>
            <input
              id="evento-cidade"
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className={CAMPO_TEXTO}
            />
          </div>
          <div>
            <label className={RUBRICA} htmlFor="evento-estado">UF</label>
            <input
              id="evento-estado"
              type="text"
              maxLength={2}
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase())}
              placeholder="RS"
              className={`${CAMPO_TEXTO} uppercase`}
            />
          </div>
        </div>

        <div>
          <label className={RUBRICA} htmlFor="evento-organizador">Organizador</label>
          <input
            id="evento-organizador"
            type="text"
            value={organizador}
            onChange={(e) => setOrganizador(e.target.value)}
            placeholder="Ex.: Velho Promoções"
            className={CAMPO_TEXTO}
          />
        </div>

        <div>
          <label className={RUBRICA} htmlFor="evento-descricao-curta">Descrição curta</label>
          <textarea
            id="evento-descricao-curta"
            value={descricaoCurta}
            onChange={(e) => setDescricaoCurta(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Usada no card da futura Landing Page"
            className={CAMPO_TEXTO}
          />
        </div>

        <div>
          <label className={RUBRICA} htmlFor="evento-descricao-completa">Descrição completa</label>
          <textarea
            id="evento-descricao-completa"
            value={descricaoCompleta}
            onChange={(e) => setDescricaoCompleta(e.target.value)}
            rows={4}
            className={CAMPO_TEXTO}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={RUBRICA} htmlFor="evento-banner">URL do banner</label>
            <input
              id="evento-banner"
              type="text"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="Opcional"
              className={CAMPO_TEXTO}
            />
          </div>
          <div>
            <label className={RUBRICA} htmlFor="evento-imagem-destaque">URL da imagem de destaque</label>
            <input
              id="evento-imagem-destaque"
              type="text"
              value={imagemDestaqueUrl}
              onChange={(e) => setImagemDestaqueUrl(e.target.value)}
              placeholder="Opcional"
              className={CAMPO_TEXTO}
            />
          </div>
        </div>

        <div>
          <label className={RUBRICA} htmlFor="evento-observacoes">Observações internas</label>
          <textarea
            id="evento-observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            placeholder="Nunca aparece na Landing Page"
            className={CAMPO_TEXTO}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Botao variante="couro" tamanho="lg" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao
          variante="latao"
          tamanho="lg"
          disabled={!podeConfirmar}
          carregando={salvando}
          rotuloCarregando="Salvando..."
          onClick={confirmar}
        >
          Salvar
        </Botao>
      </div>
    </Modal>
  );
}

package com.arena.rodeio.model;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Aggregate root da plataforma (Sprint 1: Evento isolado, sem nenhum outro
 * módulo referenciando ainda — ver CLAUDE.md § Entidade Central: Evento).
 * Landing, Administração, Operação, Financeiro e Catálogo passam a se
 * alimentar deste cadastro nas sprints seguintes; esta entrega só constrói
 * o domínio e o CRUD administrativo.
 */
@Entity
@Table(name = "eventos")
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nome;

    /** Gerado a partir do nome na criação; nunca regerado (permalink futuro estável). */
    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "descricao_curta")
    private String descricaoCurta;

    @Column(name = "descricao_completa")
    private String descricaoCompleta;

    @Column(name = "banner_url")
    private String bannerUrl;

    @Column(name = "imagem_destaque_url")
    private String imagemDestaqueUrl;

    private String cidade;

    private String estado;

    private String endereco;

    private String local;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    @Column(name = "horario_abertura")
    private LocalTime horarioAbertura;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusEvento status = StatusEvento.RASCUNHO;

    private Integer capacidade;

    private String organizador;

    private String observacoes;

    @Column(name = "criado_por_admin_id", nullable = false)
    private UUID criadoPorAdminId;

    @Column(name = "publicado_em")
    private Instant publicadoEm;

    @Column(name = "encerrado_em")
    private Instant encerradoEm;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Evento() {
        // exigido pelo JPA
    }

    public Evento(String nome, String slug, UUID criadoPorAdminId,
                  LocalDate dataInicio, LocalDate dataFim) {
        this.nome = nome;
        this.slug = slug;
        this.criadoPorAdminId = criadoPorAdminId;
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
    }

    @PrePersist
    void aoCriar() {
        var agora = Instant.now();
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    @PreUpdate
    void aoAtualizar() {
        this.atualizadoEm = Instant.now();
    }

    // --- transições de status (validação da aresta fica no service) ---

    public void publicar() {
        this.status = StatusEvento.PUBLICADO;
        this.publicadoEm = Instant.now();
    }

    public void despublicar() {
        this.status = StatusEvento.RASCUNHO;
    }

    public void iniciar() {
        this.status = StatusEvento.EM_ANDAMENTO;
    }

    public void encerrar() {
        this.status = StatusEvento.ENCERRADO;
        this.encerradoEm = Instant.now();
    }

    public void cancelar() {
        this.status = StatusEvento.CANCELADO;
    }

    public void arquivar() {
        this.status = StatusEvento.ARQUIVADO;
    }

    // --- getters / setters ---

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getSlug() {
        return slug;
    }

    public String getDescricaoCurta() {
        return descricaoCurta;
    }

    public void setDescricaoCurta(String descricaoCurta) {
        this.descricaoCurta = descricaoCurta;
    }

    public String getDescricaoCompleta() {
        return descricaoCompleta;
    }

    public void setDescricaoCompleta(String descricaoCompleta) {
        this.descricaoCompleta = descricaoCompleta;
    }

    public String getBannerUrl() {
        return bannerUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
    }

    public String getImagemDestaqueUrl() {
        return imagemDestaqueUrl;
    }

    public void setImagemDestaqueUrl(String imagemDestaqueUrl) {
        this.imagemDestaqueUrl = imagemDestaqueUrl;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public String getLocal() {
        return local;
    }

    public void setLocal(String local) {
        this.local = local;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public void setDataInicio(LocalDate dataInicio) {
        this.dataInicio = dataInicio;
    }

    public LocalDate getDataFim() {
        return dataFim;
    }

    public void setDataFim(LocalDate dataFim) {
        this.dataFim = dataFim;
    }

    public LocalTime getHorarioAbertura() {
        return horarioAbertura;
    }

    public void setHorarioAbertura(LocalTime horarioAbertura) {
        this.horarioAbertura = horarioAbertura;
    }

    public StatusEvento getStatus() {
        return status;
    }

    public Integer getCapacidade() {
        return capacidade;
    }

    public void setCapacidade(Integer capacidade) {
        this.capacidade = capacidade;
    }

    public String getOrganizador() {
        return organizador;
    }

    public void setOrganizador(String organizador) {
        this.organizador = organizador;
    }

    public String getObservacoes() {
        return observacoes;
    }

    public void setObservacoes(String observacoes) {
        this.observacoes = observacoes;
    }

    public UUID getCriadoPorAdminId() {
        return criadoPorAdminId;
    }

    public Instant getPublicadoEm() {
        return publicadoEm;
    }

    public Instant getEncerradoEm() {
        return encerradoEm;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}

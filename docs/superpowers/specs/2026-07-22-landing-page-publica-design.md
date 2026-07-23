# Landing Page Pública — Design

**Data:** 2026-07-22
**Status:** Aprovado para planejamento
**Telas novas:** `/` (Landing), `/eventos/:slug` (detalhe), `/auth` (Login/Cadastro, movida)

## Contexto e objetivo

Módulo 4 do roadmap. A raiz `/` deixa de carregar `AuthPage` diretamente e
passa a ser a Landing Page pública da Velho Promoções — institucional +
lista de eventos publicados. `AuthPage` migra para `/auth`, sem nenhuma
mudança de comportamento interno, só de rota (ver "Reorganização de Rotas"
no CLAUDE.md).

A Landing **não tem lógica própria de eventos** — consome exclusivamente
eventos com `status = PUBLICADO`, cadastrados pelo Admin na tela
`/admin-dashboard/eventos` (Sprint 1, já existente). Nenhuma duplicação de
cadastro.

Esta entrega inclui:
1. Endpoint público de leitura (`/api/eventos/publicos`), a primeira
   exceção deliberada à regra inegociável nº 6 ("nunca só authenticated()").
2. Landing completa: hero, lista de eventos, seção institucional, rodapé.
3. Página de detalhe por evento (`/eventos/:slug`), usando o slug já
   gerado pelo back-end desde a Sprint 1.
4. Reorganização de rotas (`/` ↔ `/auth`).

**Fora desta entrega, por decisão explícita:** um toggle de tema global
(light = identidade Velho Promoções, dark = Rodeio Premium) presente em
todo o sistema. Isso exigiria reestruturar o DESIGN-SYSTEM.md inteiro e
todo componente compartilhado já construído — é um projeto à parte, com
spec própria futura. Esta entrega usa **só** a identidade Velho
Promoções, fixa, exclusivamente nas telas públicas.

## Decisões de arquitetura (confirmadas com o usuário)

1. **Escopo "completo"**: hero + lista de eventos + seção institucional +
   página de detalhe — não a versão enxuta (sem seção institucional/
   detalhe) que também foi cogitada.
2. **Identidade visual própria da marca** (Velho Promoções, assets em
   `images/`) só na Área Pública — Admin/Operador continuam 100% Rodeio
   Premium, sem nenhuma alteração. Sem toggle nesta entrega (ver acima).
3. **Reorganização de rotas incluída nesta sprint** (não adiada): sem
   isso, a Landing não tem onde morar em `/`.
4. **Imagens oficiais copiadas para `frontend/public/images/`** (não
   Supabase Storage) — mais simples, evita escopo de bucket/upload nesta
   entrega. Logo e banner genérico ficam fixos no código da Landing;
   `imagemDestaqueUrl`/`bannerUrl` de cada Evento continuam campos de
   texto livre (já existentes desde a Sprint 1) — o Admin aponta pra
   `/images/imagem-pequena.jpg` (evento-demo) ou qualquer URL externa.
5. **Texto institucional é placeholder**, escrito nesta spec, fácil de
   trocar depois — não bloqueia a sprint esperando copy final da Velho
   Promoções.
6. **DTO público (`EventoPublicoResponse`) nunca reaproveita o
   `EventoResponse` administrativo** — campos de auditoria
   (`criadoPorAdminId`, timestamps, `observacoes`, `status`) nunca saem
   pelo endpoint público, mesmo que hoje pareçam inofensivos.
7. **Endpoint de detalhe público também filtra por `PUBLICADO`** — um
   evento `RASCUNHO` não pode ser acessado adivinhando o slug (404, não
   dado interno vazado).

### Layouts escolhidos (revisados e confirmados via companheiro visual)

- **Hero:** o banner oficial (`banner-velho.jpeg`) usado exatamente como
  foi entregue — já tem texto e CTA embutidos na própria imagem. Nav
  simples por cima: logo oficial à esquerda, link "Entrar" à direita.
- **Lista de eventos publicados:** grade de cards uniformes (imagem em
  cima, nome/data/local embaixo) — layout padrão, escaneável, funciona
  bem independente de quantos eventos existirem.
- **Página de detalhe do evento:** split — imagem (`imagemDestaqueUrl`,
  com fallback pro `bannerUrl`) fixa de um lado, informações e descrição
  completa do outro lado.

## Modelo de dados

**Nenhuma migration nova.** `Evento` já existe por completo desde a
Sprint 1 (`012_eventos.sql`) — esta entrega só adiciona uma via de
leitura pública sobre a mesma tabela, filtrada por status.

## Backend

**DTO novo — `EventoPublicoResponse`** (record, distinto de
`EventoResponse`):

```java
public record EventoPublicoResponse(
    String slug,
    String nome,
    String descricaoCurta,
    String descricaoCompleta,
    String bannerUrl,
    String imagemDestaqueUrl,
    String cidade,
    String estado,
    String endereco,
    String local,
    LocalDate dataInicio,
    LocalDate dataFim,
    LocalTime horarioAbertura,
    Integer capacidade,
    String organizador
) {
    public static EventoPublicoResponse from(Evento evento) { ... }
}
```

Sem `id` (o slug já identifica publicamente), sem `status`, sem
`criadoPorAdminId`, sem `observacoes`, sem `publicadoEm`/`encerradoEm`/
`criadoEm`/`atualizadoEm`.

**`EventoRepository`** ganha:
- `findByStatusOrderByDataInicioAsc(StatusEvento status)` — lista pública
- `findBySlugAndStatus(String slug, StatusEvento status)` — detalhe público

**`EventoService`** ganha:
- `listarPublicos()` → `List<EventoPublicoResponse>`, filtra
  `StatusEvento.PUBLICADO`, ordena por `dataInicio` ascendente (próximo
  primeiro — inverso do `listarTodos()` administrativo)
- `buscarPublicoPorSlug(String slug)` → `EventoPublicoResponse`, 404
  (`ResponseStatusException`) se não existir ou não estiver `PUBLICADO`

**`EventoController`** ganha dois endpoints **sem** `@PreAuthorize`:
- `GET /api/eventos/publicos` → `listarPublicos()`
- `GET /api/eventos/publicos/{slug}` → `buscarPublicoPorSlug(slug)`

**`SecurityConfig`**: novo matcher explícito e restrito, ao lado dos já
existentes (`/api/auth/aprovar`, `/api/webhooks/**`):
```java
.requestMatchers(HttpMethod.GET, "/api/eventos/publicos", "/api/eventos/publicos/**").permitAll()
```

## Frontend

**Assets:** copiar `images/logo-1.png`, `images/banner-velho.jpeg`,
`images/imagem-pequena.jpg` para `frontend/public/images/` (servidos
como estáticos pelo Vite, sem processamento).

**`lib/api.ts`:**
- `requestPublico()` — função de fetch nova, paralela ao `request()`
  existente, **sem** header `Authorization` (o `request()` atual lança
  401 se não houver sessão Supabase — errado para chamadas públicas).
  Mesmo tratamento de erro/JSON do `request()`, só sem o token.
- `EventoPublicoApi` (interface, espelha `EventoPublicoResponse`)
- `listarEventosPublicos()`, `buscarEventoPublicoPorSlug(slug)`

**`hooks/useEventosPublicos.ts`** — lista (pra Landing) + busca por slug
(pra página de detalhe), mesmo formato de estado (`carregando`/`erro`)
dos hooks já existentes.

**`pages/LandingPage.tsx`** (rota `/`):
- `LandingHeader` — logo + link "Entrar" (`/auth`)
- `LandingHero` — banner oficial full-width, sem overlay de texto
- `EventosPublicosGrid` — grade de cards; vazio → "Nenhum evento no
  momento — volte em breve"; cada card linka pra `/eventos/:slug`
- `SecaoInstitucional` — "Sobre a Velho Promoções", texto placeholder
  (ver abaixo)
- `LandingFooter` — logo pequeno, copyright, link "Entrar"

**`pages/EventoDetalhe.tsx`** (rota `/eventos/:slug`):
- Split: imagem fixa + nome, data/horário, local/endereço, descrição
  completa, organizador
- 404/não-publicado → mensagem amigável + link de volta pra `/`

**`App.tsx`:**
- `<Route path="/" element={<LandingPage />} />` (fora do `AuthProvider`
  com `ProtectedRoute` — rota pública)
- `<Route path="/eventos/:slug" element={<EventoDetalhe />} />` (pública)
- `<Route path="/auth" element={<AuthPage />} />`
- `<Route path="*" element={<Navigate to="/" replace />} />` (era `/`)

**Texto institucional (placeholder, editável depois):**

> A Velho Promoções nasceu da paixão pela tradição gaúcha e pela emoção
> genuína dos rodeios brasileiros. Organizamos eventos que unem cultura,
> entretenimento e segurança, para que cada família e cada apaixonado por
> rodeio viva a experiência completa — da arena à bilheteria.
>
> Trabalhamos para que cada evento seja memorável: da estrutura física à
> gestão financeira em tempo real, tudo pensado para que você só precise
> se preocupar em aproveitar o espetáculo.

**Paleta:** fundo escuro/preto (harmoniza com o banner oficial, que já é
preto/dourado), dourado como cor de destaque/CTA (mesmo tom do banner),
logo oficial usado como está (verde-caçador, exceção — logos não seguem
a paleta da página). Tipografia mantém Alfa Slab One (títulos) + Inter
(corpo), mesma família já usada no resto do sistema.

## Fora de escopo / riscos aceitos

- **Toggle de tema global light/dark** — deferido pra spec própria (ver
  Contexto).
- **Upload de imagem via Supabase Storage** — `bannerUrl`/
  `imagemDestaqueUrl` continuam campos de texto livre; upload direto na
  tela de cadastro de Evento é melhoria futura.
- **Busca/filtro de eventos na Landing** — lista simples, sem paginação
  nem filtro por cidade/categoria nesta entrega (poucos eventos
  esperados no início).
- **SEO avançado (meta tags dinâmicas por evento, sitemap)** — fora de
  escopo; pode entrar numa iteração futura da Landing.
- **Testes automatizados de frontend** — segue o padrão do projeto (zero
  suíte de frontend hoje); validação manual no navegador.

## Critérios de aceite

- `/` carrega a Landing (hero + eventos publicados + institucional +
  rodapé), sem exigir login.
- Eventos com `status` diferente de `PUBLICADO` nunca aparecem na lista
  nem são acessíveis por `/eventos/:slug` (404).
- Clicar num card de evento leva pro detalhe correspondente
  (`/eventos/:slug`).
- "Entrar" leva pra `/auth`, que se comporta exatamente como o login/
  cadastro atual.
- Rota desconhecida redireciona pra `/`, não mais pra login.
- Nenhuma rota/endpoint do Admin ou Operador foi alterado ou quebrado.
- `GET /api/eventos/publicos` e `GET /api/eventos/publicos/{slug}`
  funcionam sem token de autenticação; todo o resto da API continua
  exigindo JWT + role.
- Zero eventos publicados → mensagem amigável, nunca tela vazia/quebrada.

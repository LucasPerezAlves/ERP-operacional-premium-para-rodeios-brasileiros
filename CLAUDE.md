# CLAUDE.md — Controle da Arena (Gestão Financeira de Rodeio)

Sistema de controle financeiro para eventos de rodeio: bilheteria, bares, caixas,
sangrias e prestação de contas em tempo real, operando em ambiente de rede instável.

## Stack Tecnológica (OFICIAL)

> Nota histórica: menções anteriores a "Fable" referiam-se ao modelo de IA usado no
> escopo, **não** ao compilador F#. A stack F#/Elmish foi descartada e removida.

### Back-end — `backend/`
- **Linguagem:** Java 21+
- **Framework:** Spring Boot 3 (Maven)
- **Persistência:** Spring Data JPA → PostgreSQL gerenciado pelo Supabase
- **Segurança:** Spring Security como OAuth2 Resource Server, validando os
  tokens JWT emitidos pelo Supabase Auth
- **Pacote raiz:** `com.arena.rodeio` com camadas `controller`, `service`,
  `repository`, `model`, `dto`, `config`

### Front-end — `frontend/`
- **Framework:** React 18 + TypeScript + Vite
- **Estilo:** Tailwind CSS com temática **"Rodeio Premium"** — tons profundos de
  madeira (`wood`), couro desgastado (`leather`), ferrugem para erros (`rust`) e
  dourado fosco para destaques (`gold`); títulos em Alfa Slab One, corpo em Inter
- **Autenticação:** SDK oficial `@supabase/supabase-js` (signInWithPassword / signUp)
- A raiz `/` carrega diretamente a tela de Login/Cadastro — **não há landing page**

## Regras Inegociáveis

1. **Dinheiro é `BigDecimal`.** Toda transação, cálculo ou agregação monetária no
   Java usa `java.math.BigDecimal` (scale 2, `RoundingMode.HALF_EVEN`).
   **Nunca** `double` ou `float`. No banco, colunas `NUMERIC(12,2)`.
2. Imutabilidade e tipagem forte onde possível (records para DTOs, entidades com
   validação Bean Validation).
3. Textos de UI e mensagens de erro em **pt-BR**.
4. UI consistente com o tema Rodeio Premium em todas as telas (sem spinners
   genéricos — usar as animações temáticas: laço girando, poeira da arena,
   ferradura pulsando).

## Regras de Negócio do Domínio

**1. Operação Offline-First (Resiliência de Rede)**
Rodeios sofrem com rede intermitente. O front-end deve evoluir para PWA com
Service Workers e IndexedDB: vendas e recebimentos registrados localmente entram
numa fila e são sincronizados em background quando a conexão volta.

**2. Alertas Automatizados de Sangria (Segurança Física)**
Cada operador/caixa tem um limite configurável de dinheiro em espécie
(ex.: R$ 2.000,00 — campo `limiteSangria`, `BigDecimal`). Ao atingir o limite, a
interface alerta e bloqueia temporariamente funções até que um supervisor
recolha o dinheiro e registre a **Sangria** no sistema.

**3. Conciliação Automática: Dinheiro vs. Estoque**
Módulo de "Carga de Pista/Bar": o garçom recebe um volume X de bebida. No
fechamento, `dinheiro + débito + crédito` deve coincidir com
`(estoque inicial − estoque devolvido) × valor da bebida`.

**4. Autenticação por QR Code ou PIN Rápido**
Além do login por e-mail/senha (administrativo), funcionários operacionais usam
PIN numérico de 4 dígitos ou QR Code exclusivo do evento para acesso rápido em
terminais compartilhados com pouca luz.

**5. Preparação para Sistema Cashless**
O modelo de dados deve estar pronto para absorver "Fichas Virtuais" / pulseiras
RFID: recarga numa Central de Caixa e débito do saldo na venda.

**6. Rastreabilidade Rigorosa de Cortesias (Passe Livre)**
Emissão de passe livre exige **Motivo** (Staff, Convidado do Patrocinador,
Sorteio, Fornecedor) e **Autorizador** obrigatórios. O painel do Admin destaca
quem mais emitiu cortesias na noite.

## Como Rodar

```bash
# Back-end (requer JDK 21+ e variáveis de ambiente do Supabase)
cd backend
mvn spring-boot:run

# Front-end
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Variáveis de ambiente: ver `backend/src/main/resources/application.yml` e
`frontend/.env.example`.

## Roadmap de Módulos

1. **Autenticação e Gestão de Funcionários** ← em desenvolvimento
2. Caixas, vendas e sangrias
3. Carga de pista/bar e conciliação de estoque
4. Cortesias e relatórios do Admin
5. PWA offline-first e cashless/RFID

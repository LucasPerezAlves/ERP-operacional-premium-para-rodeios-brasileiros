# 🤠 Controle da Arena — Gestão Financeira de Rodeio

> **Auditoria blindada na gerência, velocidade máxima na operação.**

O **Controle da Arena** é um sistema de missão crítica projetado para gerenciar a complexa operação financeira e de pessoal durante eventos de grande porte. Desenvolvido para suportar o ritmo acelerado e a alta concorrência em pontos de venda físicos, o sistema garante o controle rígido de fluxo de caixa em tempo real, prevenção de fraudes e consolidação de valores em espécie para as operações da **Perez Prime Eventos**.

As regras de arquitetura, padrões de projeto e diretrizes de domínio estão documentadas no nosso [CLAUDE.md](CLAUDE.md).

---

## 🏗️ Arquitetura e Tecnologias

A aplicação adota uma arquitetura de Monorepo, separando as responsabilidades entre uma API robusta para transações financeiras e uma interface de usuário altamente reativa.

**Back-end (API REST)**
* **Linguagem:** Java 21 (aproveitando Virtual Threads para alta concorrência).
* **Framework:** Spring Boot 3.
* **Persistência:** Spring Data JPA.
* **Segurança:** Spring Security com validação de JWT (HS256).
* **Core Financeiro:** Uso estrito de `BigDecimal` para garantia de integridade monetária.

**Front-end (UI/UX)**
* **Core:** React 18 + TypeScript + Vite.
* **Estilização:** Tailwind CSS focado no design system **"Rodeio Premium"** (tons de madeira profunda, couro desgastado e dourado fosco).
* **Animações:** Transições fluidas e feedback visual imersivo (ex: partículas de poeira e laços giratórios), sem spinners genéricos.

**Infraestrutura e Banco de Dados**
* **Provider:** Supabase.
* **Banco de Dados:** PostgreSQL (Transações ACID para fechamentos seguros).
* **Autenticação:** Supabase Auth integrado com gatilhos (Triggers) de banco de dados.

---

## 📂 Estrutura do Monorepo

```text
├── CLAUDE.md               # Fonte da verdade: Stack oficial e regras de negócio
├── backend/                # API Spring Boot 3 (Java 21)
│   ├── pom.xml
│   ├── db/                 # Scripts SQL de referência (DDL, Triggers, Roles)
│   └── src/main/java/com/arena/rodeio/
│       ├── config/         # Interceptadores Spring Security (JWT Supabase) + CORS
│       ├── controller/     # Endpoints REST (ex: /api/auth, /api/caixa)
│       ├── dto/            # Records imutáveis para transferência de dados
│       ├── model/          # Entidades JPA mapeadas
│       ├── repository/     # Interfaces Spring Data JPA
│       └── service/        # Lógica central e validações de regras de negócio
└── frontend/               # SPA React + TS + Vite
    ├── src/
    │   ├── lib/            # Configuração do cliente @supabase/supabase-js
    │   ├── components/     # Componentes reutilizáveis (Inputs, Botões, Cards temáticos)
    │   ├── pages/          # Rotas principais (AuthPage, AdminDashboard, OperadorDashboard)
    │   └── routes/         # Guardiões de rotas (ProtectedRoute e controle RBAC)

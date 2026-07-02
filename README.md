# 🤠 Controle da Arena — Gestão Financeira de Rodeio

<div align="center">
  <img src="https://img.shields.io/badge/Status-Em%20Constru%C3%A7%C3%A3o-orange?style=for-the-badge&color=B87333" alt="Status: Em Construção">
  <img src="https://img.shields.io/badge/Vers%C3%A3o-0.2.0--beta-gold?style=for-the-badge&color=C5A059" alt="Versão 0.2.0-beta">
  <img src="https://img.shields.io/badge/Stack-Java%2021%20%7C%20React%2018-blue?style=for-the-badge&color=2C1A11" alt="Java 21 & React 18">
</div>

<br />

> 🛡️ **Auditoria blindada na gerência, velocidade máxima na operação.**
>
> O **Controle da Arena** é um sistema de missão crítica projetado para gerenciar a complexa operação financeira e de pessoal durante rodeios e eventos de grande porte da **Perez Prime Eventos**. Desenvolvido para suportar o ritmo acelerado e a alta concorrência de pontos de venda físicos, o sistema garante controle rígido de fluxo de caixa em tempo real, prevenção de fraudes e consolidação de valores em espécie.

---

## 🚧 Status Atual do Projeto

O projeto encontra-se **em desenvolvimento ativo**. 

* **Módulo 1 (Autenticação, RBAC e Gestão de Funcionários):** Semáforo Verde — 100% Concluído e Homologado.
* **Módulo 2 (Caixas, Vendas e Sangrias):** 🛠️ **Em Execução.** Back-end finalizado, front-end integrando recursos de tempo real (SOS) e PDV.
* **Módulos 3, 4 e 5 (Estoque, IA, Cortesias e PWA Offline):** Planejados no Roadmap.

> 📝 **Nota para Desenvolvedores:** As diretrizes rígidas de domínio, especificações técnicas e regras arquiteturais estão centralizadas e documentadas no nosso [CLAUDE.md](CLAUDE.md).

---

## 🏗️ Arquitetura e Tecnologias

A aplicação adota uma abordagem de **Monorepo**, garantindo isolamento total de responsabilidades, mas mantendo a velocidade de deploy e consistência de tipos.

### ⚙️ Back-end (API REST de Missão Crítica)
* **Linguagem & Runtime:** Java 21+ aproveitando *Virtual Threads* para concorrência massiva de requisições sob estresse de rede.
* **Framework:** Spring Boot 3 executando como um *OAuth2 Resource Server*.
* **Segurança Avançada:** Spring Security integrado com chaves assimétricas **ES256 (JWKS)** emitidas pelo Supabase Auth.
* **Garantia Monetária:** Uso estrito e inegociável de `java.math.BigDecimal` em todas as operações matemáticas e de persistência.

### 🎨 Front-end (UI/UX Imersiva)
* **Core:** React 18 + TypeScript + Vite.
* **Estilização:** Tailwind CSS fundamentado sob o **Design System "Rodeio Premium"** (tons de madeira profunda, couro envelhecido e dourado fosco).
* **Animações Temáticas:** Experiência sensorial livre de spinners corporativos genéricos. Feedbacks visuais baseados em laços giratórios, poeira de arena e ferraduras iluminadas.

### 🗄️ Infraestrutura e Dados
* **Banco de Dados:** PostgreSQL (Instância Supabase) utilizando transações com isolamento rígido (ACID) para fechamentos.
* **Segurança de Banco:** Triggers automatizados para perfis de usuários e replicação de metadados do Supabase Auth.

---

## 📂 Estrutura do Monorepo

```text
├── CLAUDE.md                # Fonte da verdade: Stack oficial e regras de negócio
├── DESIGN-SYSTEM.md          # Especificação técnica de UI/UX (Tokens, Tipografia e Componentes)
├── backend/                 # API Spring Boot 3 (Java 21)
│   ├── pom.xml
│   ├── db/                  # Scripts SQL de referência (DDL, Triggers, Roles)
│   └── src/main/java/com/arena/rodeio/
│       ├── config/          # Interceptadores JWT Assimétricos + CORS
│       ├── controller/      # Endpoints REST expostos e protegidos
│       ├── dto/             # Records imutáveis para tráfego seguro de dados
│       ├── model/           # Entidades JPA (Mapeamento NUMERIC(12,2) para moedas)
│       ├── repository/      # Camada de persistência Spring Data JPA
│       └── service/         # Lógica central, travas financeiras e validações
└── frontend/                # SPA React + TS + Vite
    ├── src/
    │

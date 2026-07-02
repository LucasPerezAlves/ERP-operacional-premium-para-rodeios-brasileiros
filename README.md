# Controle da Arena — Gestão Financeira de Rodeio

Monorepo com **Java 21 + Spring Boot 3** (API) e **React 18 + TypeScript + Vite + Tailwind CSS** (UI), usando **Supabase** para autenticação e PostgreSQL.

> As regras de arquitetura e de negócio estão em [CLAUDE.md](CLAUDE.md).

## Estrutura

```
├── CLAUDE.md               # Stack oficial + regras de negócio
├── backend/                # API Spring Boot 3 (Java 21)
│   ├── pom.xml
│   ├── db/                 # Scripts SQL de referência (rodar no Supabase)
│   └── src/main/java/com/arena/rodeio/
│       ├── config/         # Spring Security (JWT do Supabase) + CORS
│       ├── controller/     # REST /api/funcionarios
│       ├── dto/            # Records imutáveis (BigDecimal para dinheiro)
│       ├── model/          # Entidades JPA
│       ├── repository/     # Spring Data JPA
│       └── service/        # Regras de negócio
└── frontend/               # React + TS + Vite
    └── src/
        ├── lib/supabase.ts # Cliente @supabase/supabase-js
        └── pages/AuthPage.tsx  # Login/Cadastro (raiz "/", sem landing page)
```

## Módulo 1 — Autenticação e Gestão de Funcionários

- Tela de Login/Cadastro com tema **Rodeio Premium** (madeira, couro, dourado fosco; loading com laço girando, poeira da arena animada)
- Autenticação via Supabase (`signInWithPassword` / `signUp`)
- API protegida por Spring Security validando o JWT do Supabase (HS256)
- CRUD de funcionários com cargo, limite de sangria (`BigDecimal`) e desativação lógica

## Como rodar

### Pré-requisitos
- JDK 21+ e Maven 3.9+
- Node.js 18+
- Projeto no [Supabase](https://supabase.com) com Email auth habilitado
- Executar `backend/db/001_funcionarios.sql` no SQL Editor do Supabase

### Back-end

```bash
cd backend
# Variáveis: SUPABASE_DB_URL, SUPABASE_DB_PASSWORD, SUPABASE_JWT_SECRET
mvn spring-boot:run     # http://localhost:8080
```

### Front-end

```bash
cd frontend
cp .env.example .env    # preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev             # http://localhost:5173
```

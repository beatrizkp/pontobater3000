# Specification Document (SPEC) - Sistema de Ponto Facial W3C

## 1. Visão Geral do Projeto
Desenvolvimento de uma aplicação web para registro de ponto eletrônico com reconhecimento facial, com foco exclusivo em dispositivos Tablet e Desktop. O sistema opera diretamente no navegador sem a necessidade de um backend dedicado, utilizando o Supabase via API para persistência de dados.

---

## 2. Instruções para Agentes de IA (ex: Google Jules)

1. **Dúvidas e Incertezas:** Não inicie a codificação caso haja dúvidas técnicas ou de regra de negócio. Solicite esclarecimentos antes de prosseguir.
2. **Decomposição de Tarefas:** Sempre divida demandas extensas em tarefas e subtarefas menores antes de gerar o código.
3. **Registro no Backlog:** Mantenha atualizado o arquivo `backlog.md` na raiz do projeto. Registre todas as funcionalidades implementadas, ajustadas ou alteradas a cada ciclo de trabalho.
4. **Respeito à Stack:** Não introduza gerenciadores de pacote (NPM, Yarn), bundlers (Vite, Webpack) ou frameworks complexos (React, Vue). Mantenha o código estritamente W3C (HTML5, CSS3, JS ES6+).

---

## 3. Stack Tecnológica e Bibliotecas via CDN

- **Hospedagem / Controle de Versão:** GitHub / GitHub Pages
- **Banco de Dados:** Supabase (PostgreSQL via API REST)
- **Front-end:** HTML5, CSS3 e JavaScript Vanilla.

### Bibliotecas Permitidas (Inclusão via CDN)
Para reduzir boilerplate e evitar erros comuns, utilize estritamente as seguintes bibliotecas via CDN:
1. **Supabase JS Client:** `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm` (Comunicação com banco)
2. **Pico.css:** `https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css` (Base visual limpa)
3. **Lucide Icons:** `https://unpkg.com/lucide@latest` (Biblioteca de ícones SVG; **não utilizar emojis**)
4. **Dexie.js:** `https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.mjs` (Persistência local / Offline no IndexedDB)
5. **face-api.js:** `https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.esm.js` (Processamento biométrico facial no navegador)

---

## 4. Requisitos de UI / UX

- **Layout:** Fundo branco estritamente limpo, focado em alta legibilidade.
- **Dispositivos Alvo:** Exclusivo para Desktop e Tablet (orientação paisagem preferencial).
- **Elemento Visual:** Proibido o uso de emojis na interface. Utilize exclusivamente ícones SVG da biblioteca **Lucide Icons**.
- **APIs Nativas do Navegador:** Utilizar `navigator.mediaDevices.getUserMedia` estritamente para captura da câmera.

---

## 5. Estrutura de Arquivos do Repositório

```text
/
├── INDEX.html          # Painel do Gestor / Relatórios
├── TERMINAL.html       # Interface de leitura de ponto
├── PROJECT_SPEC.md     # Este documento de especificação
├── BACKLOG.md          # Registro contínuo de tarefas da IA
├── SCHEMA.sql          # Estrutura do banco de dados (inclui dados iniciais de teste)
├── CSS/
│   └── CUSTOM.css      # Ajustes específicos sobre o Pico.css
└── JS/
    ├── SUPABASE.js     # Configuração e inicialização do cliente Supabase
    ├── TERMINAL.js     # Lógica do terminal, biometria e offline
    └── DASHBOARD.js    # Lógica do painel de controle
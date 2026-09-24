# Backlog do Projeto - Sistema de Ponto Facial W3C

Este arquivo registra a decomposição das tarefas e subtarefas do projeto, mantendo o status de cada funcionalidade atualizado ao longo do desenvolvimento.

---

## 1. Configuração do Supabase Client
- [x] Configurar cliente Supabase em `JS/SUPABASE.js` via CDN (`@supabase/supabase-js@2`).
- [x] Definir URL e Publishable Key para acesso ao banco PostgreSQL via API REST.
- [x] Garantir exportação global ou em módulo ES6 para reutilização no Terminal e Painel.

## 2. Interface Base e Estilização (UI / UX)
- [x] Criar `CSS/CUSTOM.css` com personalizações sobre o `Pico.css`.
- [x] Configurar layout responsivo focado em Tablet e Desktop (orientação paisagem).
- [x] Integrar biblioteca `Lucide Icons` via CDN (sem uso de emojis).
- [x] Garantir visual limpo com fundo claro e alta legibilidade.

## 3. Terminal de Registro de Ponto Facial (`TERMINAL.html` e `JS/TERMINAL.js`)
- [x] **Captura e Biometria Facial:**
  - [x] Integrar câmera nativa usando `navigator.mediaDevices.getUserMedia`.
  - [x] Carregar modelos do `face-api.js` via CDN.
  - [x] Implementar detecção de rosto e cálculo do vetor descritor facial.
  - [x] Comparar descritor em tempo real com os vetores cadastrados no Supabase (`funcionarios.vetor_facial`).
- [x] **Regras de Negócio e Cálculo de Ponto:**
  - [x] Identificar tipo de registro (ENTRADA ou SAÍDA).
  - [x] Validar janela de tolerância e calcular minutos de desvio em relação ao horário previsto (`horario_entrada`, `horario_saida`).
  - [x] Definir status de frequência (`NORMAL`, `ATRASO`, `SAIDA_ANTECIPADA`).
- [x] **Modo Offline e Contingência:**
  - [x] Inicializar banco local com `Dexie.js` (IndexedDB).
  - [x] Armazenar registros em modo offline quando a conexão cair, gerando `hash_contingencia`.
  - [x] Escutar eventos de reconexão (`online`) para sincronizar registros pendentes com a tabela `registros_ponto`.
- [x] **Alertas e Monitoramento:**
  - [x] Registrar logs de eventos/falhas na tabela `alertas_terminal`.

## 4. Painel do Gestor / Dashboard (`INDEX.html` e `JS/DASHBOARD.js`)
- [x] **Relatórios de Ponto:**
  - [x] Consultar e listar histórico de `registros_ponto` relacionando dados de `funcionarios`.
  - [x] Exibir status de frequência, horário registrado, minutos de desvio e modo de registro (online/offline).
- [x] **Gestão de Funcionários:**
  - [x] Listar funcionários ativos/inativos.
  - [x] Formulário de cadastro de novos funcionários (nome, matrícula, e-mail, horários de entrada/saída).
  - [x] Captura e cadastro da biometria facial (`vetor_facial`) do funcionário.
- [x] **Gestão de Alertas do Terminal:**
  - [x] Exibir alertas e falhas do terminal registrados na tabela `alertas_terminal`.
  - [x] Permitir marcar alertas como resolvidos.

## 5. Validação e Testes
- [x] Validar fluxo completo de registro de ponto facial em modo online.
- [x] Validar retenção e sincronização no modo offline.
- [x] Testar persistência de dados e consultas no Supabase.
- [x] Executar pre-commit e verificação visual.

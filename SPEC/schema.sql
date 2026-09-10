-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Funcionários
CREATE TABLE funcionarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    vetor_facial JSONB DEFAULT NULL,
    horario_entrada TIME NOT NULL DEFAULT '08:00:00',
    horario_saida TIME NOT NULL DEFAULT '17:00:00',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Registros de Ponto
CREATE TABLE registros_ponto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    tipo VARCHAR(10) CHECK (tipo IN ('ENTRADA', 'SAIDA')) NOT NULL,
    timestamp_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_frequencia VARCHAR(20) CHECK (status_frequencia IN ('NORMAL', 'ATRASO', 'SAIDA_ANTECIPADA', 'FALTA')) NOT NULL DEFAULT 'NORMAL',
    minutos_desvio INTEGER DEFAULT 0,
    modo_offline BOOLEAN DEFAULT FALSE,
    hash_contingencia VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Ocorrências e Alertas
CREATE TABLE alertas_terminal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    terminal_id VARCHAR(50) NOT NULL,
    nivel VARCHAR(10) CHECK (nivel IN ('INFO', 'WARNING', 'CRITICAL')) NOT NULL,
    mensagem TEXT NOT NULL,
    resolvido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_terminal ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso para uso do cliente Supabase
CREATE POLICY "Leitura publica de funcionarios ativos" ON funcionarios 
    FOR SELECT USING (ativo = true);

CREATE POLICY "Insercao de registros de ponto" ON registros_ponto 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Leitura de registros pelo painel" ON registros_ponto 
    FOR SELECT USING (true);

CREATE POLICY "Insercao de alertas pelo terminal" ON alertas_terminal 
    FOR INSERT WITH CHECK (true);

-- 4. Dados Iniciais para Testes (Fixtures)

-- Cadastra a funcionária Ana Silva
INSERT INTO funcionarios (id, matricula, nome, email, horario_entrada, horario_saida, ativo)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'FUNC-001', 
    'Ana Silva', 
    'ana.silva@empresa.com', 
    '08:00:00', 
    '17:00:00', 
    TRUE
);

-- Registra uma Entrada Pontual (Normal)
INSERT INTO registros_ponto (funcionario_id, tipo, timestamp_registro, status_frequencia, minutos_desvio)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'ENTRADA',
    CURRENT_DATE + TIME '07:58:00',
    'NORMAL',
    0
);

-- Registra uma Saída Normal
INSERT INTO registros_ponto (funcionario_id, tipo, timestamp_registro, status_frequencia, minutos_desvio)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'SAIDA',
    CURRENT_DATE + TIME '17:02:00',
    'NORMAL',
    0
);

-- Inserção de um alerta inicial de teste
INSERT INTO alertas_terminal (terminal_id, nivel, mensagem)
VALUES (
    'TERMINAL_01', 
    'INFO', 
    'Terminal inicializado e pronto para operação.'
);
-- ==============================================================================
-- SCHEMA DO SUPABASE: AÇÃO SOLIDÁRIA (MISSÃO & COOPERAÇÃO)
-- ==============================================================================
-- Execute este script no SQL Editor do seu projeto no Supabase (https://supabase.com)
-- Ele criará as tabelas, índices, políticas de segurança RLS e povoará as 500 cotas.

-- 1. Habilitar extensão pgcrypto para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_comprador TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    cpf TEXT NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total > 0),
    quantidade_cotas INTEGER NOT NULL CHECK (quantidade_cotas > 0),
    status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
    transaction_id_infinitepay TEXT,
    pix_copia_cola TEXT,
    pix_qr_code_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de COTAS (1 a 500)
CREATE TABLE IF NOT EXISTS public.cotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL UNIQUE CHECK (numero >= 1 AND numero <= 500),
    status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'pago')),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Índices para performance em buscas e listagens
CREATE INDEX IF NOT EXISTS idx_cotas_status ON public.cotas(status);
CREATE INDEX IF NOT EXISTS idx_cotas_pedido_id ON public.cotas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_pagamento ON public.pedidos(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_pedidos_cpf ON public.pedidos(cpf);
CREATE INDEX IF NOT EXISTS idx_pedidos_transaction_id ON public.pedidos(transaction_id_infinitepay);

-- 5. Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER trigger_pedidos_updated_at
    BEFORE UPDATE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_cotas_updated_at ON public.cotas;
CREATE TRIGGER trigger_cotas_updated_at
    BEFORE UPDATE ON public.cotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Configuração de Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.cotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Cotas: Leitura aberta para qualquer visitante ver o mapa de cotas
DROP POLICY IF EXISTS "Qualquer um pode consultar cotas" ON public.cotas;
CREATE POLICY "Qualquer um pode consultar cotas"
    ON public.cotas FOR SELECT
    USING (true);

-- Cotas: Atualização permitida pelo Service Role (funções do servidor) ou anon autenticado
DROP POLICY IF EXISTS "Service role ou anon pode atualizar cotas vinculadas" ON public.cotas;
CREATE POLICY "Service role ou anon pode atualizar cotas vinculadas"
    ON public.cotas FOR ALL
    USING (true)
    WITH CHECK (true);

-- Pedidos: Leitura aberta para consultar status do seu pedido via ID/CPF
DROP POLICY IF EXISTS "Qualquer um pode consultar pedidos" ON public.pedidos;
CREATE POLICY "Qualquer um pode consultar pedidos"
    ON public.pedidos FOR SELECT
    USING (true);

-- Pedidos: Inserção aberta para novos pedidos
DROP POLICY IF EXISTS "Qualquer um pode criar pedido" ON public.pedidos;
CREATE POLICY "Qualquer um pode criar pedido"
    ON public.pedidos FOR INSERT
    WITH CHECK (true);

-- Pedidos: Atualização aberta (webhook / admin)
DROP POLICY IF EXISTS "Permitir atualização de pedidos" ON public.pedidos;
CREATE POLICY "Permitir atualização de pedidos"
    ON public.pedidos FOR UPDATE
    USING (true);

-- 7. Povoamento automático das 500 cotas (se ainda não existirem)
INSERT INTO public.cotas (numero, status)
SELECT num, 'disponivel'
FROM generate_series(1, 500) AS num
ON CONFLICT (numero) DO NOTHING;

-- 8. Visualização resumida do total arrecadado e status
COMMENT ON TABLE public.cotas IS 'Tabela de cotas numeradas de 1 a 500 da ação solidária';
COMMENT ON TABLE public.pedidos IS 'Tabela de pedidos com integração InfinitePay Pix/Cartão';

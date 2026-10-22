import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

// 3 horas = 10.800.000 ms
const TEMPO_EXPIRACAO_MS = 3 * 60 * 60 * 1000;

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const agora = Date.now();
    const cutoffDate = new Date(agora - TEMPO_EXPIRACAO_MS).toISOString();

    let cancelados = 0;
    let cotasLiberadas = 0;

    if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-project')) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Busca pedidos pendentes com mais de 3 horas
      const { data: expirados, error: errBusca } = await supabase
        .from('pedidos')
        .select('id')
        .eq('status_pagamento', 'pendente')
        .lt('created_at', cutoffDate);

      if (!errBusca && expirados && expirados.length > 0) {
        const ids = expirados.map((p) => p.id);
        cancelados = ids.length;

        // Atualiza pedidos para cancelado
        await supabase
          .from('pedidos')
          .update({
            status_pagamento: 'cancelado',
            updated_at: new Date().toISOString(),
          })
          .in('id', ids);

        // Libera cotas no banco
        const { data: cotasAtualizadas } = await supabase
          .from('cotas')
          .update({
            status: 'disponivel',
            pedido_id: null,
            updated_at: new Date().toISOString(),
          })
          .in('pedido_id', ids)
          .select('numero');

        if (cotasAtualizadas) {
          cotasLiberadas = cotasAtualizadas.length;
        }
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      regra: '3 horas a partir da reserva',
      pedidos_cancelados: cancelados,
      cotas_liberadas: cotasLiberadas,
    });
  } catch (err: any) {
    console.error('Erro ao expirar reservas:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar expiração de cotas.',
      detalhes: err.message,
    });
  }
}

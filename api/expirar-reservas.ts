import 'dotenv/config';
import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// 3 horas = 10.800.000 ms
const TEMPO_EXPIRACAO_MS = 3 * 60 * 60 * 1000;

export async function executarLiberacaoExpiradas() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  const agora = Date.now();
  const cutoffDate = new Date(agora - TEMPO_EXPIRACAO_MS).toISOString();

  let cancelados = 0;
  let cotasLiberadas = 0;

  if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-project')) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Busca pedidos pendentes com mais de 3 horas
    const { data: expirados, error: errBusca } = await supabase
      .from('pedidos')
      .select('id')
      .eq('status_pagamento', 'pendente')
      .lt('created_at', cutoffDate);

    if (!errBusca && expirados && expirados.length > 0) {
      const ids = expirados.map((p) => p.id);
      cancelados = ids.length;

      // Atualiza pedidos pendentes com +3h para 'cancelado'
      await supabase
        .from('pedidos')
        .update({ status_pagamento: 'cancelado' })
        .in('id', ids);

      // Libera as cotas correspondentes de volta para 'disponivel'
      const { data: cotasAtualizadas } = await supabase
        .from('cotas')
        .update({
          status: 'disponivel',
          pedido_id: null,
        })
        .in('pedido_id', ids)
        .select('numero');

      if (cotasAtualizadas) {
        cotasLiberadas += cotasAtualizadas.length;
      }
    }

    // 2. Proteção Adicional contra Cotas Reservadas Órfãs:
    // Caso alguma cota tenha ficado com status 'reservado' mas o pedido associado já tenha sido cancelado ou não exista
    const { data: cotasReservadas } = await supabase
      .from('cotas')
      .select('id, numero, pedido_id')
      .eq('status', 'reservado');

    if (cotasReservadas && cotasReservadas.length > 0) {
      const idsSemPedido = cotasReservadas.filter((c) => !c.pedido_id).map((c) => c.numero);
      if (idsSemPedido.length > 0) {
        await supabase
          .from('cotas')
          .update({ status: 'disponivel', pedido_id: null })
          .in('numero', idsSemPedido);
        cotasLiberadas += idsSemPedido.length;
      }

      // Cotas com pedido_id: verifica se o pedido foi cancelado
      const pedidosIds = cotasReservadas.filter((c) => c.pedido_id).map((c) => c.pedido_id as string);
      if (pedidosIds.length > 0) {
        const { data: pedidosStatus } = await supabase
          .from('pedidos')
          .select('id, status_pagamento')
          .in('id', pedidosIds);

        const pedidosCanceladosSet = new Set(
          (pedidosStatus || []).filter((p) => p.status_pagamento === 'cancelado').map((p) => p.id)
        );

        const cotasParaLiberar = cotasReservadas
          .filter((c) => c.pedido_id && pedidosCanceladosSet.has(c.pedido_id))
          .map((c) => c.numero);

        if (cotasParaLiberar.length > 0) {
          await supabase
            .from('cotas')
            .update({ status: 'disponivel', pedido_id: null })
            .in('numero', cotasParaLiberar);
          cotasLiberadas += cotasParaLiberar.length;
        }
      }
    }
  }

  return { cancelados, cotasLiberadas, timestamp: new Date().toISOString() };
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { cancelados, cotasLiberadas, timestamp } = await executarLiberacaoExpiradas();

    return res.status(200).json({
      success: true,
      timestamp,
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

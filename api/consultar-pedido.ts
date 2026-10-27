import 'dotenv/config';
import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://tnnrppcrcakipkmfedmm.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_57UbZEeDu8lqMnhj90eghQ_TL7W0Yoo';

export default async function handler(req: Request, res: Response) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;
  const infinitePayHandle = process.env.INFINITEPAY_HANDLE || 'jocimar-silva-128';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const id = (req.query.id as string) || (req.body?.id as string) || (req.query.order_nsu as string);
  const slug = (req.query.slug as string) || (req.body?.slug as string);
  const transactionNsu = (req.query.transaction_nsu as string) || (req.body?.transaction_nsu as string);
  const handle = (req.query.handle as string) || infinitePayHandle;

  if (!id) {
    return res.status(400).json({ error: 'ID do pedido (order_nsu) é obrigatório' });
  }

  let statusPagamento = 'pendente';
  let dadosPedido: any = null;

  // 1. Consulta no Supabase
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

  if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-project')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      let query = supabase.from('pedidos').select('*, cotas(numero, status)');

      if (isUuid) {
        query = query.eq('id', id);
      } else {
        query = query.eq('transaction_id_infinitepay', id);
      }

      const { data: pedido, error } = await query.maybeSingle();

      if (!error && pedido) {
        dadosPedido = pedido;
        statusPagamento = pedido.status_pagamento;
      }
    } catch (e: any) {
      console.warn('Erro ao consultar pedido no Supabase:', e.message);
    }
  }

  // 2. Se ainda estiver pendente, mas tivermos slug ou transaction_nsu, consulta a API Oficial da InfinitePay payment_check
  // POST https://api.checkout.infinitepay.io/payment_check
  if (statusPagamento !== 'pago' && (slug || transactionNsu || id)) {
    try {
      const checkRes = await fetch('https://api.checkout.infinitepay.io/payment_check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: handle,
          order_nsu: id,
          transaction_nsu: transactionNsu || '',
          slug: slug || '',
        }),
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.paid === true) {
          statusPagamento = 'pago';

          // Atualiza no Supabase imediatamente
          if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-project')) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            if (isUuid) {
              await supabase
                .from('pedidos')
                .update({ status_pagamento: 'pago' })
                .eq('id', id);
              await supabase
                .from('cotas')
                .update({ status: 'pago' })
                .eq('pedido_id', id);
            }
          }
        }
      }
    } catch (errCheck) {
      // Ignora silenciosamente falha de verificação de rede externa
    }
  }

  return res.status(200).json({
    id,
    order_nsu: id,
    status_pagamento: statusPagamento,
    nome_comprador: dadosPedido?.nome_comprador,
    valor_total: dadosPedido?.valor_total,
    quantidade_cotas: dadosPedido?.quantidade_cotas,
    cotas: dadosPedido?.cotas || [],
    mensagem: statusPagamento === 'pago' ? 'Pagamento Aprovado' : 'Aguardando Pagamento',
  });
}

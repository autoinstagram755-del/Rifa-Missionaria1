import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export default async function handler(req: Request, res: Response) {
  // Apenas requisições POST são aceitas pelo webhook
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Webhook aceita apenas POST.' });
  }

  try {
    const payload = req.body;
    console.log('[Webhook InfinitePay] Payload recebido com sucesso:', JSON.stringify(payload));

    // Formato oficial da documentação InfinitePay Checkout Integrado:
    // {
    //   "invoice_slug": "abc123",
    //   "amount": 1000,
    //   "paid_amount": 1010,
    //   "installments": 1,
    //   "capture_method": "credit_card" (ou "pix"),
    //   "transaction_nsu": "UUID",
    //   "order_nsu": "UUID-do-pedido",
    //   "receipt_url": "https://comprovante.com/123",
    //   "items": [...]
    // }

    const orderNsu = payload.order_nsu || payload.data?.order_nsu || payload.metadata?.pedido_id;
    const transactionNsu = payload.transaction_nsu || payload.data?.id || payload.id;
    const invoiceSlug = payload.invoice_slug || payload.slug;
    const captureMethod = payload.capture_method || 'pix';
    const receiptUrl = payload.receipt_url || '';

    if (!orderNsu && !transactionNsu) {
      console.warn('[Webhook InfinitePay] order_nsu ou transaction_nsu ausente. Retornando 400 para reenvio.');
      return res.status(400).json({
        error: 'Identificador do pedido (order_nsu) ausente no payload.',
      });
    }

    // Atualização no Supabase
    if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-project')) {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

      let query = supabaseClient.from('pedidos').update({
        status_pagamento: 'pago',
        transaction_id_infinitepay: transactionNsu || invoiceSlug,
        updated_at: new Date().toISOString(),
      });

      if (orderNsu) {
        query = query.eq('id', orderNsu);
      } else {
        query = query.eq('transaction_id_infinitepay', transactionNsu);
      }

      const { data: pedidoAtualizado, error: errPed } = await query.select().single();

      if (errPed) {
        console.error('[Webhook InfinitePay] Erro ao atualizar pedido no Supabase:', errPed);
      } else if (pedidoAtualizado) {
        // Atualiza todas as cotas vinculadas ao pedido para status 'pago'
        const { error: errCotas } = await supabaseClient
          .from('cotas')
          .update({
            status: 'pago',
            updated_at: new Date().toISOString(),
          })
          .eq('pedido_id', pedidoAtualizado.id);

        if (errCotas) {
          console.error('[Webhook InfinitePay] Erro ao atualizar cotas no Supabase:', errCotas);
        } else {
          console.log(
            `[Webhook InfinitePay] Pedido ${pedidoAtualizado.id} confirmado com sucesso via ${captureMethod}!`
          );
        }
      }
    }

    // Resposta imediata 200 OK com confirmação
    return res.status(200).json({
      received: true,
      status: 'success',
      order_nsu: orderNsu,
      transaction_nsu: transactionNsu,
      capture_method: captureMethod,
      receipt_url: receiptUrl,
    });
  } catch (error: any) {
    console.error('[Webhook InfinitePay] Erro inesperado ao processar webhook:', error);
    // Retorna 400 Bad Request conforme a documentação da InfinitePay para solicitar reenvio automático
    return res.status(400).json({
      error: 'Falha no processamento do webhook',
      detalhes: error.message,
    });
  }
}

import 'dotenv/config';
import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  calcularValorTotal,
  validarCPF,
  formatarNumeroCota,
  gerarPixBacen,
  CHAVE_PIX_OFICIAL,
  CHAVE_PIX_FORMATADA,
  NOME_TITULAR_PIX,
  CIDADE_PIX,
} from '../src/utils/rules.ts';

export default async function handler(req: Request, res: Response) {
  // Chaves do ambiente
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  const infinitePayApiKey = process.env.INFINITEPAY_API_KEY || '';
  const infinitePayHandle = process.env.INFINITEPAY_HANDLE || 'jocimar-silva-128';
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const { nome, whatsapp, cpf, quantidadeCotas, numerosEscolhidos, handleCustom, metodo } = req.body;
    const metodoEscolhido = metodo === 'cartao' ? 'cartao' : 'pix';

    // 1. Validações básicas
    if (!nome || typeof nome !== 'string' || nome.trim().length < 3) {
      return res.status(400).json({ error: 'Nome completo inválido (mínimo 3 caracteres).' });
    }

    const whatsDigits = (whatsapp || '').replace(/\D/g, '');
    if (!whatsapp || typeof whatsapp !== 'string' || whatsDigits.length < 10) {
      return res.status(400).json({ error: 'WhatsApp inválido. Informe o DDD e o número completo.' });
    }

    const cpfLimpo = (cpf || '').replace(/\D/g, '');
    if (!validarCPF(cpfLimpo)) {
      return res.status(400).json({ error: 'CPF inválido. Verifique os dígitos informados.' });
    }

    const qtd = Number(quantidadeCotas);
    if (!qtd || qtd < 1) {
      return res.status(400).json({ error: 'Quantidade de cotas inválida.' });
    }

    const valorTotal = calcularValorTotal(qtd);
    const valorEmCentavos = Math.round(valorTotal * 100);
    const pedidoId = crypto.randomUUID();
    const effectiveHandle = handleCustom?.trim() || infinitePayHandle || 'jocimar-silva-128';

    let cotasFinais: number[] = [];

    // 2. Reserva de cotas no Supabase (se configurado)
    let supabaseClient = null;
    if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-project')) {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    }

    if (supabaseClient) {
      // Libera automaticamente qualquer cota com reserva expirada (+3h) antes de verificar disponibilidade
      try {
        const { executarLiberacaoExpiradas } = await import('./expirar-reservas.ts');
        await executarLiberacaoExpiradas();
      } catch (eExp) {
        // Ignora silenciosamente para não interromper a reserva
      }

      // Se o usuário selecionou números específicos
      if (Array.isArray(numerosEscolhidos) && numerosEscolhidos.length === qtd) {
        const { data: cotasDisponiveis, error: errVerif } = await supabaseClient
          .from('cotas')
          .select('numero, status')
          .in('numero', numerosEscolhidos);

        if (errVerif) {
          throw new Error('Erro ao consultar cotas no banco de dados.');
        }

        const indisponiveis = cotasDisponiveis?.filter((c) => c.status !== 'disponivel') || [];
        if (indisponiveis.length > 0) {
          const indisponiveisFormatadas = indisponiveis.map((c) => formatarNumeroCota(c.numero)).join(', ');
          return res.status(409).json({
            error: `As seguintes cotas acabaram de ser reservadas ou pagas: ${indisponiveisFormatadas}. Por favor, escolha outros números.`,
          });
        }
        cotasFinais = numerosEscolhidos;
      } else {
        // Seleção automática das primeiras cotas disponíveis
        const { data: disponiveis, error: errBusca } = await supabaseClient
          .from('cotas')
          .select('numero')
          .eq('status', 'disponivel')
          .order('numero', { ascending: true })
          .limit(qtd);

        if (errBusca || !disponiveis || disponiveis.length < qtd) {
          return res.status(400).json({
            error: `Desculpe, não há ${qtd} cotas disponíveis no momento. Restam poucas cotas!`,
          });
        }

        cotasFinais = disponiveis.map((c) => c.numero);
      }

      // Registra o pedido no Supabase com UUID válido
      const { error: errPedido } = await supabaseClient.from('pedidos').insert({
        id: pedidoId,
        nome_comprador: nome.trim(),
        whatsapp: whatsapp.trim(),
        cpf: cpfLimpo,
        valor_total: valorTotal,
        quantidade_cotas: qtd,
        status_pagamento: 'pendente',
        transaction_id_infinitepay: null,
        created_at: new Date().toISOString(),
      });

      if (errPedido) {
        console.error('Erro ao criar pedido no Supabase:', errPedido);
      }

      // Atualiza status das cotas para 'reservado'
      const { error: errCotas } = await supabaseClient
        .from('cotas')
        .update({
          status: 'reservado',
          pedido_id: pedidoId,
        })
        .in('numero', cotasFinais);

      if (errCotas) {
        console.error('Erro ao reservar cotas:', errCotas);
      }
    } else {
      // Modo local / demonstração
      cotasFinais =
        Array.isArray(numerosEscolhidos) && numerosEscolhidos.length === qtd
          ? numerosEscolhidos
          : Array.from({ length: qtd }, (_, i) => i + 101);
    }

    // 3. Chamada Oficial à API da InfinitePay (Checkout Integrado)
    // Documentação oficial: POST https://api.checkout.infinitepay.io/links
    let checkoutUrl = '';
    let invoiceSlug = '';
    let pixCopiaECola = '';
    let pixQrCodeUrl = '';

    const payloadInfinitePay: any = {
      handle: effectiveHandle,
      items: [
        {
          quantity: 1,
          price: valorEmCentavos, // Centavos (ex: R$ 50,00 = 5000)
          description: `Ação Solidária: ${qtd} ${qtd === 1 ? 'Cota' : 'Cotas'} (Nº ${cotasFinais
            .slice(0, 5)
            .map((n) => formatarNumeroCota(n))
            .join(', ')}${cotasFinais.length > 5 ? '...' : ''})`,
        },
      ],
      order_nsu: pedidoId,
      redirect_url: `${appUrl}/?order_nsu=${pedidoId}&status=sucesso`,
      webhook_url: `${appUrl}/api/webhook-infinitepay`,
      customer: {
        name: nome.trim(),
        phone_number: `+55${whatsDigits}`,
      },
      options: {
        single_payment: true,
        payment_methods_enabled: ['credit_card', 'pix'],
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (infinitePayApiKey && !infinitePayApiKey.includes('your_infinitepay')) {
      headers['X-Api-Key'] = infinitePayApiKey;
    }

    try {
      console.log('[InfinitePay] Enviando requisição para https://api.checkout.infinitepay.io/links');
      const responseInfinite = await fetch('https://api.checkout.infinitepay.io/links', {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadInfinitePay),
      });

      if (responseInfinite.ok) {
        const dataInf = await responseInfinite.json();
        console.log('[InfinitePay] Link gerado com sucesso:', dataInf);
        checkoutUrl = dataInf.url || dataInf.link || dataInf.checkout_url || '';
        invoiceSlug = dataInf.slug || dataInf.invoice_slug || '';
        if (dataInf.pix?.qrcode || dataInf.pix_copia_cola) {
          pixCopiaECola = dataInf.pix?.qrcode || dataInf.pix_copia_cola;
        }
      } else {
        const errorText = await responseInfinite.text();
        console.warn(`[InfinitePay] API retornou status ${responseInfinite.status}:`, errorText);
      }
    } catch (errApi) {
      console.warn('[InfinitePay] Erro na chamada à API:', errApi);
    }

    // Se a InfinitePay gerou checkoutUrl, também montamos ou mantemos chave Pix EMV
    if (!checkoutUrl) {
      // Fallback amigável de checkout se a API oficial não estiver acessível
      checkoutUrl = `https://checkout.infinitepay.io/${effectiveHandle}?amount=${valorEmCentavos}&order_nsu=${pedidoId}`;
    }

    // Gera o código Pix Copia e Cola Oficial (Padrão Banco Central / BR Code com CRC16 válido)
    const txid = pedidoId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
    pixCopiaECola = gerarPixBacen(
      CHAVE_PIX_OFICIAL,
      NOME_TITULAR_PIX,
      CIDADE_PIX,
      valorTotal,
      txid
    );

    const expiracaoEmHoras = 3;
    const expiresAt = new Date(Date.now() + expiracaoEmHoras * 60 * 60 * 1000).toISOString();

    return res.status(200).json({
      success: true,
      pedido_id: pedidoId,
      order_nsu: pedidoId,
      invoice_slug: invoiceSlug,
      handle: effectiveHandle,
      nome_comprador: nome.trim(),
      whatsapp: whatsapp.trim(),
      cpf: cpfLimpo,
      valor_total: valorTotal,
      valor_centavos: valorEmCentavos,
      quantidade_cotas: qtd,
      cotas_numeros: cotasFinais,
      status: 'pendente',
      metodo: metodoEscolhido,
      checkout_url: checkoutUrl,
      pix_copia_cola: pixCopiaECola,
      pix_qr_code_url: pixQrCodeUrl,
      chave_pix: CHAVE_PIX_OFICIAL,
      chave_pix_formatada: CHAVE_PIX_FORMATADA,
      titular_pix: NOME_TITULAR_PIX,
      cidade_pix: CIDADE_PIX,
      expires_at: expiresAt,
      mensagem: 'Cotas reservadas e Pix oficial gerado com sucesso!',
    });
  } catch (err: any) {
    console.error('Erro em /api/criar-pagamento:', err);
    return res.status(500).json({
      error: 'Erro interno ao processar pedido e reserva de cotas.',
      detalhes: err.message,
    });
  }
}

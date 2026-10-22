import { createClient } from '@supabase/supabase-js';
import { TOTAL_COTAS, calcularValorTotal, TEMPO_EXPIRACAO_RESERVA_MS } from '../utils/rules.ts';

export interface Cota {
  id: string;
  numero: number;
  status: 'disponivel' | 'reservado' | 'pago';
  pedido_id: string | null;
  updated_at?: string;
}

export interface Pedido {
  id: string;
  nome_comprador: string;
  whatsapp: string;
  cpf: string;
  valor_total: number;
  quantidade_cotas: number;
  status_pagamento: 'pendente' | 'pago' | 'cancelado';
  transaction_id_infinitepay?: string | null;
  pix_copia_cola?: string | null;
  pix_qr_code_url?: string | null;
  created_at: string;
  updated_at?: string;
  cotas_numeros?: number[];
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes('your-anon-key')
);

// Cria o cliente Supabase oficial
export const supabase = createClient(
  supabaseUrl || 'https://xyzcompany.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'
);

// Chaves do localStorage para modo de demonstração / fallback offline
const LOCAL_STORAGE_COTAS_KEY = 'acao_solidaria_cotas_v1';
const LOCAL_STORAGE_PEDIDOS_KEY = 'acao_solidaria_pedidos_v1';

/**
 * Inicializa 500 cotas padrão para demonstração instantânea no navegador
 */
function gerarCotasIniciais(): Cota[] {
  const cotas: Cota[] = [];
  // Gera 500 cotas, com algumas cotas já reservadas e pagas para dar realismo à demonstração
  const pagasIniciais = new Set([7, 12, 19, 33, 44, 77, 88, 100, 115, 142, 150, 200, 218, 250, 312, 333, 400, 444]);
  const reservadasIniciais = new Set([15, 52, 99, 175, 280, 410]);

  for (let i = 1; i <= TOTAL_COTAS; i++) {
    let status: 'disponivel' | 'reservado' | 'pago' = 'disponivel';
    let pedido_id: string | null = null;

    if (pagasIniciais.has(i)) {
      status = 'pago';
      pedido_id = 'seed-order-pago';
    } else if (reservadasIniciais.has(i)) {
      status = 'reservado';
      pedido_id = 'seed-order-reservado';
    }

    cotas.push({
      id: `cota-${i}`,
      numero: i,
      status,
      pedido_id,
      updated_at: new Date().toISOString(),
    });
  }
  return cotas;
}

/**
 * Carrega a lista completa de cotas (1 a 500)
 * Libera automaticamente cotas com reservas expiradas há mais de 3 horas
 */
export async function obterCotas(): Promise<Cota[]> {
  // Verifica e libera reservas com mais de 3 horas
  try {
    await verificarELiberarCotasExpiradas();
  } catch (e) {
    // Continua mesmo se der erro na verificação
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('cotas')
        .select('*')
        .order('numero', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Cota[];
      }
      console.warn('Supabase não retornou cotas, utilizando estado local.', error);
    } catch (err) {
      console.warn('Erro ao conectar ao Supabase, alternando para local.', err);
    }
  }

  // Fallback LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_COTAS_KEY);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error('Erro ao ler localStorage', e);
    }
  }

  const cotasIniciais = gerarCotasIniciais();
  localStorage.setItem(LOCAL_STORAGE_COTAS_KEY, JSON.stringify(cotasIniciais));
  return cotasIniciais;
}

/**
 * Salva cotas no estado local
 */
export function salvarCotasLocais(cotas: Cota[]): void {
  localStorage.setItem(LOCAL_STORAGE_COTAS_KEY, JSON.stringify(cotas));
}

/**
 * Carrega pedidos
 */
export async function obterPedidos(): Promise<Pedido[]> {
  try {
    await verificarELiberarCotasExpiradas();
  } catch (e) {}

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as Pedido[];
      }
    } catch (err) {
      console.warn('Erro ao obter pedidos do Supabase', err);
    }
  }

  const localPedidos = localStorage.getItem(LOCAL_STORAGE_PEDIDOS_KEY);
  if (localPedidos) {
    try {
      return JSON.parse(localPedidos);
    } catch (e) {
      console.error('Erro ao ler pedidos locais', e);
    }
  }
  return [];
}

/**
 * Salva pedido localmente
 */
export function salvarPedidoLocal(novoPedido: Pedido): void {
  const localPedidos = localStorage.getItem(LOCAL_STORAGE_PEDIDOS_KEY);
  let lista: Pedido[] = [];
  if (localPedidos) {
    try {
      lista = JSON.parse(localPedidos);
    } catch (e) {
      lista = [];
    }
  }
  // Se já existe, atualiza, senão adiciona
  const index = lista.findIndex((p) => p.id === novoPedido.id);
  if (index >= 0) {
    lista[index] = novoPedido;
  } else {
    lista.unshift(novoPedido);
  }
  localStorage.setItem(LOCAL_STORAGE_PEDIDOS_KEY, JSON.stringify(lista));
}

/**
 * Atualiza status de um pedido e suas cotas (usado na confirmação Pix / Webhook / Painel Admin)
 */
export async function atualizarStatusPedido(
  pedidoId: string,
  novoStatus: 'pago' | 'cancelado' | 'pendente'
): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('pedidos')
        .update({ status_pagamento: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', pedidoId);

      if (novoStatus === 'pago') {
        await supabase
          .from('cotas')
          .update({ status: 'pago', updated_at: new Date().toISOString() })
          .eq('pedido_id', pedidoId);
      } else if (novoStatus === 'cancelado') {
        await supabase
          .from('cotas')
          .update({ status: 'disponivel', pedido_id: null, updated_at: new Date().toISOString() })
          .eq('pedido_id', pedidoId);
      }
    } catch (e) {
      console.error('Erro ao atualizar no Supabase:', e);
    }
  }

  // Atualiza localmente também
  const localPedidos = localStorage.getItem(LOCAL_STORAGE_PEDIDOS_KEY);
  if (localPedidos) {
    try {
      const lista: Pedido[] = JSON.parse(localPedidos);
      const target = lista.find((p) => p.id === pedidoId);
      if (target) {
        target.status_pagamento = novoStatus;
        localStorage.setItem(LOCAL_STORAGE_PEDIDOS_KEY, JSON.stringify(lista));
      }
    } catch (e) {}
  }

  const localCotas = localStorage.getItem(LOCAL_STORAGE_COTAS_KEY);
  if (localCotas) {
    try {
      const cotas: Cota[] = JSON.parse(localCotas);
      let alterou = false;
      for (const c of cotas) {
        if (c.pedido_id === pedidoId) {
          alterou = true;
          if (novoStatus === 'pago') {
            c.status = 'pago';
          } else if (novoStatus === 'cancelado') {
            c.status = 'disponivel';
            c.pedido_id = null;
          }
        }
      }
      if (alterou) {
        localStorage.setItem(LOCAL_STORAGE_COTAS_KEY, JSON.stringify(cotas));
      }
    } catch (e) {}
  }

  return true;
}

/**
 * Verifica pedidos pendentes com mais de 3 horas e libera suas cotas automaticamente
 */
export async function verificarELiberarCotasExpiradas(): Promise<{ pedidosCancelados: number; cotasLiberadas: number }> {
  const agora = Date.now();
  let pedidosCancelados = 0;
  let cotasLiberadas = 0;

  if (isSupabaseConfigured) {
    try {
      const limiteExpiracaoIso = new Date(agora - TEMPO_EXPIRACAO_RESERVA_MS).toISOString();
      const { data: expirados, error } = await supabase
        .from('pedidos')
        .select('id')
        .eq('status_pagamento', 'pendente')
        .lt('created_at', limiteExpiracaoIso);

      if (!error && expirados && expirados.length > 0) {
        const ids = expirados.map((p) => p.id);
        pedidosCancelados += ids.length;

        // Atualiza pedidos expirados para 'cancelado'
        await supabase
          .from('pedidos')
          .update({ status_pagamento: 'cancelado', updated_at: new Date().toISOString() })
          .in('id', ids);

        // Libera as cotas correspondentes
        const { data: cotasLiberadasDb } = await supabase
          .from('cotas')
          .update({ status: 'disponivel', pedido_id: null, updated_at: new Date().toISOString() })
          .in('pedido_id', ids)
          .select('numero');

        if (cotasLiberadasDb) {
          cotasLiberadas += cotasLiberadasDb.length;
        }
      }
    } catch (e) {
      console.warn('Erro ao expirar reservas no Supabase:', e);
    }
  }

  // Fallback e sincronização LocalStorage
  const localPedidos = localStorage.getItem(LOCAL_STORAGE_PEDIDOS_KEY);
  const localCotas = localStorage.getItem(LOCAL_STORAGE_COTAS_KEY);

  if (localPedidos && localCotas) {
    try {
      const listaPedidos: Pedido[] = JSON.parse(localPedidos);
      const listaCotas: Cota[] = JSON.parse(localCotas);
      const idsCancelados = new Set<string>();

      for (const ped of listaPedidos) {
        if (ped.status_pagamento === 'pendente') {
          const tempoCriacao = new Date(ped.created_at).getTime();
          if (agora - tempoCriacao >= TEMPO_EXPIRACAO_RESERVA_MS) {
            ped.status_pagamento = 'cancelado';
            idsCancelados.add(ped.id);
            pedidosCancelados++;
          }
        }
      }

      if (idsCancelados.size > 0) {
        for (const c of listaCotas) {
          if (c.pedido_id && idsCancelados.has(c.pedido_id) && c.status === 'reservado') {
            c.status = 'disponivel';
            c.pedido_id = null;
            c.updated_at = new Date().toISOString();
            cotasLiberadas++;
          }
        }
        localStorage.setItem(LOCAL_STORAGE_PEDIDOS_KEY, JSON.stringify(listaPedidos));
        localStorage.setItem(LOCAL_STORAGE_COTAS_KEY, JSON.stringify(listaCotas));
      }
    } catch (e) {
      console.warn('Erro ao expirar reservas locais:', e);
    }
  }

  return { pedidosCancelados, cotasLiberadas };
}

/**
 * Reseta o banco de demonstração para valores iniciais
 */
export function restaurarDemonstracao(): void {
  localStorage.removeItem(LOCAL_STORAGE_COTAS_KEY);
  localStorage.removeItem(LOCAL_STORAGE_PEDIDOS_KEY);
}

/**
 * Cria um pedido manual direto pelo Painel Administrativo
 * Usado quando a pessoa paga em dinheiro vivo em mãos, Pix avulso direto no banco, etc.
 */
export async function criarPedidoManualAdmin(params: {
  nome: string;
  whatsapp: string;
  cpf?: string;
  cotasNumeros: number[];
  formaPagamento: 'dinheiro' | 'pix_direto' | 'maquininha';
}): Promise<{ success: boolean; pedidoId: string; error?: string }> {
  const pedidoId = `adm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const qtd = params.cotasNumeros.length;
  const valorTotal = calcularValorTotal(qtd);
  const now = new Date().toISOString();

  const novoPedido: Pedido = {
    id: pedidoId,
    nome_comprador: params.nome.trim(),
    whatsapp: params.whatsapp.trim(),
    cpf: params.cpf ? params.cpf.replace(/\D/g, '') : 'SEM_CPF_MANUAL',
    valor_total: valorTotal,
    quantidade_cotas: qtd,
    status_pagamento: 'pago',
    transaction_id_infinitepay: `MANUAL_${params.formaPagamento.toUpperCase()}`,
    cotas_numeros: params.cotasNumeros,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    try {
      const { error: errPed } = await supabase.from('pedidos').insert({
        id: pedidoId,
        nome_comprador: novoPedido.nome_comprador,
        whatsapp: novoPedido.whatsapp,
        cpf: novoPedido.cpf,
        valor_total: valorTotal,
        quantidade_cotas: qtd,
        status_pagamento: 'pago',
        transaction_id_infinitepay: novoPedido.transaction_id_infinitepay,
        created_at: now,
        updated_at: now,
      });

      if (!errPed) {
        await supabase
          .from('cotas')
          .update({
            status: 'pago',
            pedido_id: pedidoId,
            updated_at: now,
          })
          .in('numero', params.cotasNumeros);
      }
    } catch (e) {
      console.warn('Erro ao salvar no Supabase:', e);
    }
  }

  // Atualiza localmente também
  salvarPedidoLocal(novoPedido);

  // Atualiza cotas locais
  const localCotas = localStorage.getItem(LOCAL_STORAGE_COTAS_KEY);
  if (localCotas) {
    try {
      const cotas: Cota[] = JSON.parse(localCotas);
      const setNumeros = new Set(params.cotasNumeros);
      for (const c of cotas) {
        if (setNumeros.has(c.numero)) {
          c.status = 'pago';
          c.pedido_id = pedidoId;
          c.updated_at = now;
        }
      }
      localStorage.setItem(LOCAL_STORAGE_COTAS_KEY, JSON.stringify(cotas));
    } catch (e) {}
  }

  return { success: true, pedidoId };
}


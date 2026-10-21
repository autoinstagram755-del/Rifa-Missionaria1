import React, { useState } from 'react';
import {
  X,
  LayoutDashboard,
  Database,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Download,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { Pedido, Cota, atualizarStatusPedido, restaurarDemonstracao } from '../lib/supabase.ts';
import { formatarMoeda, formatarNumeroCota, mascararCPF, mascararWhatsApp } from '../utils/rules.ts';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidos: Pedido[];
  cotas: Cota[];
  onRecarregarDados: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  pedidos,
  cotas,
  onRecarregarDados,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'pedidos' | 'cotas' | 'sql' | 'infinitepay'>('pedidos');
  const [busca, setBusca] = useState('');
  const [copiouSql, setCopiouSql] = useState(false);
  const [testandoWebhook, setTestandoWebhook] = useState(false);
  const [resultadoWebhook, setResultadoWebhook] = useState<string | null>(null);

  if (!isOpen) return null;

  const cotasPagas = cotas.filter((c) => c.status === 'pago');
  const cotasReservadas = cotas.filter((c) => c.status === 'reservado');
  const cotasDisponiveis = cotas.filter((c) => c.status === 'disponivel');

  const totalArrecadado = pedidos
    .filter((p) => p.status_pagamento === 'pago')
    .reduce((acc, p) => acc + Number(p.valor_total || 0), 0);

  const pedidosFiltrados = pedidos.filter((p) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      p.nome_comprador.toLowerCase().includes(termo) ||
      p.cpf.includes(termo) ||
      p.whatsapp.includes(termo) ||
      p.id.toLowerCase().includes(termo)
    );
  });

  const handleMarcarComoPago = async (pedidoId: string) => {
    await atualizarStatusPedido(pedidoId, 'pago');
    onRecarregarDados();
  };

  const handleCancelarPedido = async (pedidoId: string) => {
    if (confirm('Deseja realmente cancelar este pedido e liberar as cotas reservadas?')) {
      await atualizarStatusPedido(pedidoId, 'cancelado');
      onRecarregarDados();
    }
  };

  const handleRestaurarBanco = () => {
    if (confirm('Deseja restaurar as cotas e pedidos de teste para o estado inicial?')) {
      restaurarDemonstracao();
      onRecarregarDados();
    }
  };

  const sqlScript = `-- SCRIPT SUPABASE: AÇÃO SOLIDÁRIA
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_comprador TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    cpf TEXT NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL,
    quantidade_cotas INTEGER NOT NULL,
    status_pagamento TEXT NOT NULL DEFAULT 'pendente',
    transaction_id_infinitepay TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'disponivel',
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL
);

ALTER TABLE public.cotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cotas públicas" ON public.cotas FOR SELECT USING (true);
CREATE POLICY "Pedidos públicos" ON public.pedidos FOR SELECT USING (true);

INSERT INTO public.cotas (numero, status)
SELECT num, 'disponivel' FROM generate_series(1, 500) AS num
ON CONFLICT (numero) DO NOTHING;`;

  const copiarSql = async () => {
    await navigator.clipboard.writeText(sqlScript);
    setCopiouSql(true);
    setTimeout(() => setCopiouSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 sm:p-7 text-white my-6 max-h-[90vh] flex flex-col">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Topo do Painel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">Painel da Ação Solidária</h3>
              <p className="text-xs text-slate-400">
                Gestão de cotas, pedidos e conciliação de pagamentos InfinitePay
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRestaurarBanco}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
              title="Restaura os dados de teste locais"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Resetar Teste</span>
            </button>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Arrecadado</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400">
              {formatarMoeda(totalArrecadado)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Cotas Pagas</span>
            <span className="text-lg sm:text-xl font-bold text-white">
              {cotasPagas.length}{' '}
              <span className="text-xs text-slate-500 font-normal">/ 500</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Cotas Reservadas</span>
            <span className="text-lg sm:text-xl font-bold text-amber-400">
              {cotasReservadas.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Cotas Livres</span>
            <span className="text-lg sm:text-xl font-bold text-blue-400">
              {cotasDisponiveis.length}
            </span>
          </div>
        </div>

        {/* Abas */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setAbaAtiva('pedidos')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              abaAtiva === 'pedidos'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Pedidos Recebidos ({pedidos.length})
          </button>
          <button
            onClick={() => setAbaAtiva('infinitepay')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              abaAtiva === 'infinitepay'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>InfinitePay &amp; Webhook</span>
          </button>
          <button
            onClick={() => setAbaAtiva('sql')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              abaAtiva === 'sql'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Script SQL Supabase</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="mt-4 flex-1 overflow-y-auto">
          {abaAtiva === 'pedidos' && (
            <div className="space-y-3">
              {/* Filtro de Busca */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Filtrar por nome, CPF ou WhatsApp..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {pedidosFiltrados.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <p className="text-sm">Nenhum pedido encontrado com este critério.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
                  {pedidosFiltrados.map((ped) => {
                    const isPago = ped.status_pagamento === 'pago';
                    const isCancelado = ped.status_pagamento === 'cancelado';

                    return (
                      <div
                        key={ped.id}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/60 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm">
                              {ped.nome_comprador}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full uppercase ${
                                isPago
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                                  : isCancelado
                                  ? 'bg-rose-950 text-rose-300 border border-rose-600/50'
                                  : 'bg-amber-950 text-amber-300 border border-amber-600/50'
                              }`}
                            >
                              {ped.status_pagamento}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>WhatsApp: {mascararWhatsApp(ped.whatsapp)}</span>
                            <span>CPF: {mascararCPF(ped.cpf)}</span>
                            <span>Qtd: {ped.quantidade_cotas} cotas</span>
                            <span className="text-amber-300 font-semibold">
                              Total: {formatarMoeda(ped.valor_total)}
                            </span>
                          </div>

                          {ped.cotas_numeros && ped.cotas_numeros.length > 0 && (
                            <div className="text-[11px] font-mono text-slate-400">
                              Cotas: {ped.cotas_numeros.map((n) => formatarNumeroCota(n)).join(', ')}
                            </div>
                          )}
                        </div>

                        {/* Ações Administrativas */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {!isPago && !isCancelado && (
                            <button
                              onClick={() => handleMarcarComoPago(ped.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                              title="Confirmar pagamento manualmente"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Confirmar Pago</span>
                            </button>
                          )}

                          {!isCancelado && (
                            <button
                              onClick={() => handleCancelarPedido(ped.id)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                              title="Cancelar pedido e liberar cotas"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Liberar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {abaAtiva === 'infinitepay' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200 space-y-2">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <span>Conexão Oficial: InfinitePay Checkout Integrado</span>
                </div>
                <p className="text-slate-300">
                  A integração utiliza a API oficial da InfinitePay (<code>https://api.checkout.infinitepay.io/links</code>),
                  gerando links dinâmicos para pagamentos no Pix e Cartão de Crédito.
                </p>
              </div>

              {/* Parâmetros do seu Negócio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Sua InfiniteTag (Handle)
                  </span>
                  <div className="font-mono text-sm font-bold text-white bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    jocimar-silva-128
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    Utilizada no payload da requisição para creditar as vendas na sua conta InfinitePay.
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                    URL do seu Webhook (Produção)
                  </span>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded-xl border border-slate-800 break-all select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook-infinitepay` : '/api/webhook-infinitepay'}
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    Cadastre esta URL nas configurações de Checkout do App/Painel InfinitePay.
                  </span>
                </div>
              </div>

              {/* Botão de Teste de Webhook */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Simular Envio do Webhook InfinitePay</h4>
                  <p className="text-xs text-slate-400">
                    Dispara uma notificação POST de teste com <code>capture_method: &quot;pix&quot;</code> para validar a recepção.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={testandoWebhook}
                  onClick={async () => {
                    setTestandoWebhook(true);
                    setResultadoWebhook(null);
                    try {
                      // Procura o primeiro pedido pendente ou cria um ID de teste
                      const pedidoPendente = pedidos.find((p) => p.status_pagamento === 'pendente') || pedidos[0];
                      const orderNsu = pedidoPendente?.id || `ped-teste-${Date.now()}`;

                      const res = await fetch('/api/webhook-infinitepay', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          invoice_slug: 'slug-teste-123',
                          amount: 5000,
                          paid_amount: 5000,
                          installments: 1,
                          capture_method: 'pix',
                          transaction_nsu: `tx-${Date.now()}`,
                          order_nsu: orderNsu,
                          receipt_url: 'https://comprovante.infinitepay.io/exemplo-123',
                          items: [
                            {
                              quantity: 1,
                              price: 5000,
                              description: 'Ação Solidária - Teste Webhook',
                            },
                          ],
                        }),
                      });

                      const data = await res.json();
                      if (res.ok) {
                        setResultadoWebhook(`Sucesso (Status 200 OK): ${data.message || 'Webhook recebido e processado!'}`);
                        onRecarregarDados();
                      } else {
                        setResultadoWebhook(`Erro (${res.status}): ${data.error || 'Falha ao responder webhook'}`);
                      }
                    } catch (e: any) {
                      setResultadoWebhook(`Erro de conexão: ${e.message}`);
                    } finally {
                      setTestandoWebhook(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 shadow-md"
                >
                  {testandoWebhook ? 'Enviando...' : 'Testar Webhook Localmente'}
                </button>
              </div>

              {resultadoWebhook && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400">
                  {resultadoWebhook}
                </div>
              )}

              {/* Exemplo do Payload Oficial */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Exemplo de Payload Gerado (POST https://api.checkout.infinitepay.io/links)
                </span>
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300 overflow-x-auto">
{`{
  "handle": "jocimar-silva-128",
  "items": [
    {
      "quantity": 1,
      "price": 5000,
      "description": "Combo Missão (3 Cotas) - Ação Solidária"
    }
  ],
  "order_nsu": "ped-1729500000-xyz",
  "redirect_url": "https://sua-acao-solidaria.vercel.app/?order_nsu=ped-1729500000-xyz&status=sucesso",
  "webhook_url": "https://sua-acao-solidaria.vercel.app/api/webhook-infinitepay",
  "customer": {
    "name": "Nome do Irmão",
    "phone_number": "+5561998765432"
  },
  "options": {
    "single_payment": true,
    "payment_methods_enabled": ["credit_card", "pix"]
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {abaAtiva === 'sql' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <p className="font-bold text-sm text-blue-100">
                    Seu Projeto Supabase: <span className="text-amber-300 font-mono">tnnrppcrcakipkmfedmm</span>
                  </p>
                  <a
                    href="https://supabase.com/dashboard/project/tnnrppcrcakipkmfedmm/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto"
                  >
                    <span>Abrir SQL Editor do seu Projeto</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-slate-300 mb-2">
                  Execute o script SQL abaixo uma única vez para criar as tabelas <code>cotas</code> (com 500 cotas já povoadas) e <code>pedidos</code>:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-300">
                  <li>Clique no botão verde acima para abrir o SQL Editor do seu projeto.</li>
                  <li>Clique no botão &quot;Copiar Script SQL&quot; abaixo.</li>
                  <li>Cole no editor e clique em &quot;Run&quot; (Ctrl+Enter). Pronto!</li>
                </ol>
              </div>

              <div className="relative">
                <button
                  onClick={copiarSql}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-md"
                >
                  {copiouSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>SQL Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script SQL</span>
                    </>
                  )}
                </button>

                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96">
                  {sqlScript}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

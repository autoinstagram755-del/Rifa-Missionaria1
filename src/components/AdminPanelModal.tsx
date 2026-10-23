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
  Banknote,
  PlusCircle,
  Receipt,
  UserPlus,
  Send,
  AlertCircle,
  CheckCheck,
  MessageSquare,
  Bell,
  Clock3,
  ShieldCheck,
} from 'lucide-react';
import {
  Pedido,
  Cota,
  atualizarStatusPedido,
  restaurarDemonstracao,
  criarPedidoManualAdmin,
  verificarELiberarCotasExpiradas,
} from '../lib/supabase.ts';
import {
  formatarMoeda,
  formatarNumeroCota,
  mascararCPF,
  mascararWhatsApp,
  calcularValorTotal,
  COMBOS_DISPONIVEIS,
  gerarMensagemLembreteWhatsapp,
  TEMPO_EXPIRACAO_RESERVA_MS,
} from '../utils/rules.ts';
import { registrarLogAuditoria } from '../lib/auditLogs.ts';
import { AuditLogsViewer } from './AuditLogsViewer.tsx';

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
  const [abaAtiva, setAbaAtiva] = useState<'pedidos' | 'cotas_reservadas' | 'venda_manual' | 'lembretes_whatsapp' | 'infinitepay' | 'logs_auditoria' | 'sql'>('pedidos');
  const [busca, setBusca] = useState('');
  const [copiouSql, setCopiouSql] = useState(false);
  const [testandoWebhook, setTestandoWebhook] = useState(false);
  const [resultadoWebhook, setResultadoWebhook] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  // Estados para Venda Manual / Balcão
  const [manualNome, setManualNome] = useState('');
  const [manualWhatsapp, setManualWhatsapp] = useState('');
  const [manualCpf, setManualCpf] = useState('');
  const [manualFormaPagamento, setManualFormaPagamento] = useState<'dinheiro' | 'pix_direto' | 'maquininha'>('dinheiro');
  const [manualCotasSelecionadas, setManualCotasSelecionadas] = useState<number[]>([]);
  const [manualFaixaAtiva, setManualFaixaAtiva] = useState<'todas' | '1-100' | '101-200' | '201-300' | '301-400' | '401-500'>('1-100');
  const [manualBuscaCota, setManualBuscaCota] = useState('');
  const [manualSalvando, setManualSalvando] = useState(false);
  const [manualErro, setManualErro] = useState<string | null>(null);
  const [manualSucesso, setManualSucesso] = useState<{
    pedidoId: string;
    nome: string;
    whatsapp: string;
    valor: number;
    cotas: number[];
  } | null>(null);
  const [copiouRecibo, setCopiouRecibo] = useState(false);
  const [copiouMsgId, setCopiouMsgId] = useState<string | null>(null);
  const [executandoLimpeza, setExecutandoLimpeza] = useState(false);

  if (!isOpen) return null;

  const cotasPagas = cotas.filter((c) => c.status === 'pago');
  const cotasReservadas = cotas.filter((c) => c.status === 'reservado');
  const cotasDisponiveis = cotas.filter((c) => c.status === 'disponivel');
  const pedidosPendentes = pedidos.filter((p) => p.status_pagamento === 'pendente');

  const totalArrecadado = pedidos
    .filter((p) => p.status_pagamento === 'pago')
    .reduce((acc, p) => acc + Number(p.valor_total || 0), 0);

  const handleSincronizarSupabase = async () => {
    setSincronizando(true);
    try {
      await onRecarregarDados();
      registrarLogAuditoria({
        tipo: 'sincronizacao',
        titulo: 'Sincronização com o Banco Supabase',
        detalhes: `Sincronização sob demanda executada pelo Administrador. Dados de ${cotas.length} cotas e ${pedidos.length} pedidos atualizados.`,
        origem: 'admin_painel',
        status: 'sucesso',
      });
    } catch (err: any) {
      registrarLogAuditoria({
        tipo: 'erro',
        titulo: 'Falha na Sincronização Supabase',
        detalhes: err.message || 'Erro de rede ou conexão com o banco.',
        origem: 'admin_painel',
        status: 'erro',
      });
    } finally {
      setTimeout(() => setSincronizando(false), 500);
    }
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase().trim();
    const numeroBusca = parseInt(termo.replace(/\D/g, ''), 10);
    const temCota = !isNaN(numeroBusca) && p.cotas_numeros?.includes(numeroBusca);
    return (
      p.nome_comprador.toLowerCase().includes(termo) ||
      p.cpf.includes(termo) ||
      p.whatsapp.includes(termo) ||
      p.id.toLowerCase().includes(termo) ||
      temCota
    );
  });

  const handleMarcarComoPago = async (pedidoId: string) => {
    const ped = pedidos.find((p) => p.id === pedidoId);
    await atualizarStatusPedido(pedidoId, 'pago');
    registrarLogAuditoria({
      tipo: 'pagamento',
      titulo: `Pedido #${pedidoId.slice(0, 8).toUpperCase()} Marcado como Pago`,
      detalhes: `Comprador: ${ped?.nome_comprador || 'Apoiador'} • WhatsApp: ${ped?.whatsapp || 'N/A'} • Valor: ${ped?.valor_total ? formatarMoeda(ped.valor_total) : 'R$ 20,00'}`,
      cotas: ped?.cotas_numeros,
      pedidoId,
      comprador: ped?.nome_comprador,
      valor: ped?.valor_total,
      origem: 'admin_painel',
      status: 'sucesso',
    });
    onRecarregarDados();
  };

  const handleCancelarPedido = async (pedidoId: string) => {
    const ped = pedidos.find((p) => p.id === pedidoId);
    if (confirm('Deseja realmente cancelar este pedido e liberar as cotas reservadas?')) {
      await atualizarStatusPedido(pedidoId, 'cancelado');
      registrarLogAuditoria({
        tipo: 'cancelamento',
        titulo: `Pedido #${pedidoId.slice(0, 8).toUpperCase()} Cancelado (Cotas Liberadas)`,
        detalhes: `Reserva cancelada pelo Administrador. Cotas devolvidas para a grade pública: ${(ped?.cotas_numeros || []).map((n) => formatarNumeroCota(n)).join(', ')}`,
        cotas: ped?.cotas_numeros,
        pedidoId,
        comprador: ped?.nome_comprador,
        origem: 'admin_painel',
        status: 'aviso',
      });
      onRecarregarDados();
    }
  };

  const handleLancarVendaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualErro(null);

    if (!manualNome.trim() || manualNome.trim().length < 3) {
      setManualErro('Por favor, informe o nome completo do comprador.');
      return;
    }

    const whatsDigits = manualWhatsapp.replace(/\D/g, '');
    if (!manualWhatsapp.trim() || whatsDigits.length < 10) {
      setManualErro('Por favor, informe um WhatsApp/telefone válido com DDD (mínimo 10 dígitos).');
      return;
    }

    if (manualCotasSelecionadas.length === 0) {
      setManualErro('Selecione pelo menos uma cota disponível na tabela abaixo ou use os combos promocionais.');
      return;
    }

    // Verifica em tempo real se alguma cota selecionada já não está ocupada
    const ocupadas = cotas.filter((c) => manualCotasSelecionadas.includes(c.numero) && c.status !== 'disponivel');
    if (ocupadas.length > 0) {
      const strOcupadas = ocupadas.map((c) => formatarNumeroCota(c.numero)).join(', ');
      setManualErro(`As seguintes cotas foram reservadas/pagas por outro comprador: ${strOcupadas}. Escolha outras cotas livres.`);
      return;
    }

    const cotasSelecionadas = [...manualCotasSelecionadas].sort((a, b) => a - b);

    setManualSalvando(true);
    try {
      const valorTotal = calcularValorTotal(cotasSelecionadas.length);
      const res = await criarPedidoManualAdmin({
        nome: manualNome.trim(),
        whatsapp: manualWhatsapp.trim(),
        cpf: manualCpf.trim() ? manualCpf.replace(/\D/g, '') : undefined,
        cotasNumeros: cotasSelecionadas,
        formaPagamento: manualFormaPagamento,
      });

      if (res.success) {
        registrarLogAuditoria({
          tipo: 'venda_manual',
          titulo: `Venda Balcão: ${cotasSelecionadas.length} cota(s) para ${manualNome.trim()}`,
          detalhes: `Forma de Pagamento: ${manualFormaPagamento.toUpperCase()} • Cotas: ${cotasSelecionadas.map((n) => formatarNumeroCota(n)).join(', ')}`,
          cotas: cotasSelecionadas,
          pedidoId: res.pedidoId,
          comprador: manualNome.trim(),
          valor: valorTotal,
          origem: 'admin_painel',
          status: 'sucesso',
        });

        setManualSucesso({
          pedidoId: res.pedidoId,
          nome: manualNome.trim(),
          whatsapp: manualWhatsapp.trim(),
          valor: valorTotal,
          cotas: cotasSelecionadas,
        });
        setManualNome('');
        setManualWhatsapp('');
        setManualCpf('');
        setManualCotasSelecionadas([]);
        onRecarregarDados();
      } else {
        setManualErro(res.error || 'Erro ao lançar cotas.');
      }
    } catch (err: any) {
      setManualErro(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setManualSalvando(false);
    }
  };

  const copiarReciboWhatsapp = async (recibo: { nome: string; valor: number; cotas: number[] }) => {
    const texto = `Paz do Senhor, ${recibo.nome}!\n\nConfirmamos a sua participação na Ação Solidária: Missão & Cooperação.\n\n🎟️ Seus números da sorte no sorteio do Relógio Especial:\n${recibo.cotas.map((n) => formatarNumeroCota(n)).join(', ')} (${recibo.cotas.length} ${recibo.cotas.length === 1 ? 'cota' : 'cotas'})\n\n💰 Valor recebido: ${formatarMoeda(recibo.valor)}\n\nMuito obrigado pelo seu apoio e cooperação missionária! Deus abençoe abundantemente.`;
    await navigator.clipboard.writeText(texto);
    setCopiouRecibo(true);
    setTimeout(() => setCopiouRecibo(false), 3000);
  };

  const handleToggleManualCota = (numero: number) => {
    const cota = cotas.find((c) => c.numero === numero);
    if (!cota || cota.status !== 'disponivel') return;

    setManualCotasSelecionadas((prev) =>
      prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero].sort((a, b) => a - b)
    );
    setManualErro(null);
  };

  const handleSelectComboManual = (quantidade: number) => {
    const disponiveis = cotas.filter((c) => c.status === 'disponivel').map((c) => c.numero);
    if (disponiveis.length < quantidade) {
      setManualErro(`Apenas ${disponiveis.length} cotas disponíveis no momento.`);
      return;
    }
    const embaralhadas = [...disponiveis].sort(() => 0.5 - Math.random());
    const selecionadas = embaralhadas.slice(0, quantidade).sort((a, b) => a - b);
    setManualCotasSelecionadas(selecionadas);
    setManualErro(null);
  };

  const handleLimparManualCotas = () => {
    setManualCotasSelecionadas([]);
    setManualErro(null);
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
              onClick={handleSincronizarSupabase}
              disabled={sincronizando}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
              title="Sincronizar em tempo real com o banco de dados Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
              <span>{sincronizando ? 'Sincronizando...' : 'Sincronizar Dados'}</span>
            </button>

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
            onClick={() => setAbaAtiva('cotas_reservadas')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              abaAtiva === 'cotas_reservadas'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Cotas Reservadas ({cotasReservadas.length})</span>
          </button>
          <button
            onClick={() => {
              setAbaAtiva('venda_manual');
              setManualSucesso(null);
              setManualErro(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              abaAtiva === 'venda_manual'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Lançar Venda (Dinheiro / Balcão)</span>
          </button>
          <button
            onClick={() => setAbaAtiva('lembretes_whatsapp')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              abaAtiva === 'lembretes_whatsapp'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Lembretes WhatsApp (1h &amp; 15m)</span>
            {pedidosPendentes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                {pedidosPendentes.length}
              </span>
            )}
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
            onClick={() => setAbaAtiva('logs_auditoria')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              abaAtiva === 'logs_auditoria'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Logs de Auditoria</span>
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
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[11px] text-slate-400">Cotas:</span>
                              {ped.cotas_numeros.map((n) => (
                                <span
                                  key={n}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                                    isPago
                                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                                      : 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                                  }`}
                                >
                                  {formatarNumeroCota(n)}
                                </span>
                              ))}
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

          {abaAtiva === 'cotas_reservadas' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-1">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Gestão de Cotas Reservadas no Sistema</span>
                </div>
                <p className="text-slate-300">
                  Cotas com reservas ativas aguardam pagamento por até 3 horas. Você pode confirmar o pagamento ou liberar a cota de volta para a grade imediatamente.
                </p>
              </div>

              {cotasReservadas.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-white">Nenhuma cota reservada no momento</p>
                  <p className="text-xs text-slate-400 mt-1">Todas as cotas estão livres ou já foram 100% pagas e confirmadas!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {cotasReservadas.map((cota) => {
                    const pedidoVinculado = pedidos.find((p) => p.id === cota.pedido_id);
                    return (
                      <div
                        key={cota.numero}
                        className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-mono font-black text-amber-300 bg-amber-400/20 px-3 py-1 rounded-xl border border-amber-400/40">
                            #{formatarNumeroCota(cota.numero)}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600/40">
                            Reservada
                          </span>
                        </div>

                        {pedidoVinculado ? (
                          <div className="text-xs space-y-1 text-slate-300 border-t border-slate-800/80 pt-2">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Comprador:</span>
                              <strong className="text-white">{pedidoVinculado.nome_comprador}</strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>WhatsApp: {mascararWhatsApp(pedidoVinculado.whatsapp)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 pt-2">
                            Reserva sem pedido detalhado
                          </div>
                        )}

                        <div className="flex items-center space-x-2 pt-1">
                          {cota.pedido_id && (
                            <button
                              onClick={() => handleMarcarComoPago(cota.pedido_id!)}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Pago</span>
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (confirm(`Deseja liberar a cota #${formatarNumeroCota(cota.numero)} agora?`)) {
                                if (cota.pedido_id) {
                                  await handleCancelarPedido(cota.pedido_id);
                                }
                              }
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Liberar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {abaAtiva === 'venda_manual' && (
            <div className="space-y-6">
              {/* Header da Aba */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 space-y-1">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Lançamento Manual de Cotas (Balcão / Dinheiro / Pix Direto)</span>
                </div>
                <p className="text-slate-300">
                  Cadastre compradores que pagaram em <strong>dinheiro em mãos</strong> no culto, na igreja, ou que enviaram Pix avulso diretamente para o Pastor. As cotas ficam marcadas como <strong>PAGAS</strong> na hora e computadas no total da ação!
                </p>
              </div>

              {manualSucesso ? (
                /* Card de Sucesso / Recibo Gerado */
                <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCheck className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                      Cotas Lançadas com Sucesso!
                    </span>
                    <h4 className="text-2xl font-black text-white">Venda Confirmada &amp; Paga</h4>
                    <p className="text-xs text-slate-400">
                      Comprador: <strong className="text-white">{manualSucesso.nome}</strong> • {manualSucesso.whatsapp}
                    </p>
                  </div>

                  {/* Números Atribuídos */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                      <span>Valor Recebido:</span>
                      <span className="text-emerald-400 font-extrabold text-sm font-mono">
                        {formatarMoeda(manualSucesso.valor)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-amber-400 font-bold block mb-1.5">
                        Números da Sorte ({manualSucesso.cotas.length} {manualSucesso.cotas.length === 1 ? 'cota' : 'cotas'}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {manualSucesso.cotas.map((num) => (
                          <span
                            key={num}
                            className="px-2.5 py-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-lg text-xs font-mono font-bold"
                          >
                            {formatarNumeroCota(num)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ações pós-lançamento */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <button
                      onClick={() => copiarReciboWhatsapp(manualSucesso)}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 transition cursor-pointer shadow-md"
                    >
                      {copiouRecibo ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-950" />
                          <span>Mensagem Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Comprovante p/ WhatsApp do Comprador</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setManualSucesso(null);
                        setManualErro(null);
                      }}
                      className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                    >
                      + Lançar Outra Venda
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulário de Venda Manual */
                <form onSubmit={handleLancarVendaManual} className="space-y-4">
                  {manualErro && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{manualErro}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nome Completo do Comprador <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={manualNome}
                        onChange={(e) => setManualNome(e.target.value)}
                        placeholder="Ex: Maria de Lourdes Silva"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        WhatsApp / Celular com DDD <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={manualWhatsapp}
                        onChange={(e) => setManualWhatsapp(mascararWhatsApp(e.target.value))}
                        placeholder="(61) 98765-4321"
                        maxLength={15}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        CPF do Comprador <span className="text-slate-500">(Opcional se pagar em dinheiro)</span>
                      </label>
                      <input
                        type="text"
                        value={manualCpf}
                        onChange={(e) => setManualCpf(mascararCPF(e.target.value))}
                        placeholder="000.000.000-00 (Opcional)"
                        maxLength={14}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Forma de Pagamento Recebida <span className="text-amber-400">*</span>
                      </label>
                      <select
                        value={manualFormaPagamento}
                        onChange={(e: any) => setManualFormaPagamento(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-400"
                      >
                        <option value="dinheiro">💵 Dinheiro em Espécie (Pago em Mãos)</option>
                        <option value="pix_direto">📱 Pix Direto na Conta (Comprovante em Mãos)</option>
                        <option value="maquininha">💳 Cartão Presencial / Maquininha</option>
                      </select>
                    </div>
                  </div>

                  {/* SEÇÃO 1: COMBOS PROMOCIONAIS DE COTAS */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                          1. Combos Promocionais &amp; Seleção Rápida
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Clique em um combo para sortear cotas livres automaticamente ou escolha números na tabela abaixo.
                        </p>
                      </div>

                      {manualCotasSelecionadas.length > 0 && (
                        <button
                          type="button"
                          onClick={handleLimparManualCotas}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 hover:bg-rose-950/60 border border-rose-800/60 transition cursor-pointer self-start sm:self-auto"
                        >
                          Limpar Seleção
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      {[
                        { qtd: 1, label: '1 Cota', sub: 'Individual', val: 20 },
                        { qtd: 3, label: '3 Cotas', sub: 'Combo Missão (Economize R$ 10)', val: 50 },
                        { qtd: 7, label: '7 Cotas', sub: 'Liderança (Economize R$ 40)', val: 100 },
                        { qtd: 15, label: '15 Cotas', sub: 'Patrocinador (Economize R$ 100)', val: 200 },
                      ].map((combo) => {
                        const isMatch = manualCotasSelecionadas.length === combo.qtd;
                        return (
                          <button
                            key={combo.qtd}
                            type="button"
                            onClick={() => handleSelectComboManual(combo.qtd)}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer active:scale-95 flex flex-col justify-between ${
                              isMatch
                                ? 'bg-amber-400/15 border-amber-400 text-amber-300 ring-2 ring-amber-400/50 shadow-md'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-850'
                            }`}
                          >
                            <div>
                              <span className="block text-xs font-extrabold text-white">{combo.label}</span>
                              <span className="block text-[10px] text-slate-400 leading-tight mt-0.5">{combo.sub}</span>
                            </div>
                            <span className="block text-sm font-black text-amber-400 mt-2 font-mono">
                              {formatarMoeda(combo.val)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SEÇÃO 2: TABELA INTERATIVA COM AS 500 COTAS */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">
                          2. Mapa Geral das 500 Cotas (Clique para Escolher)
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Cotas pagas e reservadas ficam bloqueadas automaticamente, impedindo venda de números duplicados.
                        </p>
                      </div>

                      {/* Busca Rápida de Cota */}
                      <div className="relative min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={manualBuscaCota}
                          onChange={(e) => setManualBuscaCota(e.target.value)}
                          placeholder="Buscar cota (ex: 206)..."
                          className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                        {manualBuscaCota && (
                          <button
                            type="button"
                            onClick={() => setManualBuscaCota('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Faixas de Centenas */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400 mr-1 font-medium">Centenas:</span>
                      {[
                        { id: '1-100', label: '001 a 100', min: 1, max: 100 },
                        { id: '101-200', label: '101 a 200', min: 101, max: 200 },
                        { id: '201-300', label: '201 a 300', min: 201, max: 300 },
                        { id: '301-400', label: '301 a 400', min: 301, max: 400 },
                        { id: '401-500', label: '401 a 500', min: 401, max: 500 },
                        { id: 'todas', label: 'Todas as 500', min: 1, max: 500 },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setManualFaixaAtiva(f.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            manualFaixaAtiva === f.id
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Legenda de Status */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <span className="w-3 h-3 rounded bg-slate-800 border border-slate-600 inline-block" />
                        <span>Livre (Clique p/ marcar)</span>
                      </span>
                      <span className="flex items-center space-x-1 text-amber-300 font-bold">
                        <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                        <span>Selecionada ({manualCotasSelecionadas.length})</span>
                      </span>
                      <span className="flex items-center space-x-1 text-amber-500">
                        <span className="w-3 h-3 rounded bg-amber-950 border border-amber-800 inline-block" />
                        <span>Reservada (Bloqueado)</span>
                      </span>
                      <span className="flex items-center space-x-1 text-slate-500">
                        <span className="w-3 h-3 rounded bg-slate-950 border border-slate-900 inline-block" />
                        <span>Já Paga (Bloqueado)</span>
                      </span>
                    </div>

                    {/* Grade das Cotas */}
                    <div className="pt-2 max-h-60 overflow-y-auto p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
                      {(() => {
                        const cotasFiltradas = cotas.filter((c) => {
                          if (manualFaixaAtiva === '1-100' && (c.numero < 1 || c.numero > 100)) return false;
                          if (manualFaixaAtiva === '101-200' && (c.numero < 101 || c.numero > 200)) return false;
                          if (manualFaixaAtiva === '201-300' && (c.numero < 201 || c.numero > 300)) return false;
                          if (manualFaixaAtiva === '301-400' && (c.numero < 301 || c.numero > 400)) return false;
                          if (manualFaixaAtiva === '401-500' && (c.numero < 401 || c.numero > 500)) return false;
                          if (manualBuscaCota.trim()) {
                            const termo = manualBuscaCota.trim();
                            const numFmt = formatarNumeroCota(c.numero);
                            return numFmt.includes(termo) || String(c.numero).includes(termo);
                          }
                          return true;
                        });

                        if (cotasFiltradas.length === 0) {
                          return (
                            <div className="py-8 text-center text-xs text-slate-400">
                              Nenhuma cota encontrada para este filtro.
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-1.5">
                            {cotasFiltradas.map((c) => {
                              const isSelected = manualCotasSelecionadas.includes(c.numero);
                              const isPago = c.status === 'pago';
                              const isReservado = c.status === 'reservado';
                              const isDisponivel = c.status === 'disponivel';

                              let classe = 'bg-slate-900 text-slate-200 border-slate-800 hover:border-emerald-400 hover:text-white';

                              if (isSelected) {
                                classe = 'bg-amber-400 text-slate-950 font-black border-amber-300 ring-2 ring-amber-400 scale-105 shadow-md';
                              } else if (isPago) {
                                classe = 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed opacity-40 line-through';
                              } else if (isReservado) {
                                classe = 'bg-amber-950/40 text-amber-600 border-amber-900/50 cursor-not-allowed opacity-60';
                              }

                              return (
                                <button
                                  key={c.numero}
                                  type="button"
                                  disabled={!isDisponivel}
                                  onClick={() => isDisponivel && handleToggleManualCota(c.numero)}
                                  title={
                                    isSelected
                                      ? `Cota #${formatarNumeroCota(c.numero)}: Selecionada para esta venda`
                                      : isPago
                                      ? `Cota #${formatarNumeroCota(c.numero)}: Já PAGA (Bloqueada)`
                                      : isReservado
                                      ? `Cota #${formatarNumeroCota(c.numero)}: Reservada (Bloqueada)`
                                      : `Cota #${formatarNumeroCota(c.numero)}: Livre (Clique para selecionar)`
                                  }
                                  className={`h-9 rounded-lg text-xs font-mono font-bold flex items-center justify-center border transition-all cursor-pointer ${classe}`}
                                >
                                  {formatarNumeroCota(c.numero)}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Resumo Dinâmico das Cotas Selecionadas e Valor */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">
                            Cotas Selecionadas ({manualCotasSelecionadas.length}):
                          </span>
                          {manualCotasSelecionadas.length === 0 && (
                            <span className="text-xs text-amber-400/90 italic">
                              Nenhuma cota selecionada ainda.
                            </span>
                          )}
                        </div>

                        {manualCotasSelecionadas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 max-h-20 overflow-y-auto">
                            {manualCotasSelecionadas.map((num) => (
                              <span
                                key={num}
                                className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1"
                              >
                                <span>#{formatarNumeroCota(num)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleManualCota(num)}
                                  className="text-amber-400 hover:text-white ml-0.5 p-0.5"
                                  title="Remover cota"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-medium">Valor Total a Cobrar:</span>
                        <span className="text-xl font-black text-emerald-400 font-mono">
                          {formatarMoeda(calcularValorTotal(manualCotasSelecionadas.length))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Envio */}
                  <button
                    type="submit"
                    disabled={manualSalvando || manualCotasSelecionadas.length === 0}
                    className="w-full py-4 px-4 rounded-xl font-black text-sm sm:text-base bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {manualSalvando ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registrando Venda no Supabase...</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-5 h-5" />
                        <span>
                          {manualCotasSelecionadas.length === 0
                            ? 'Selecione Cotas na Tabela Acima para Concluir'
                            : `Confirmar Venda Balcão (${manualCotasSelecionadas.length} ${
                                manualCotasSelecionadas.length === 1 ? 'Cota' : 'Cotas'
                              } • ${formatarMoeda(calcularValorTotal(manualCotasSelecionadas.length))})`}
                        </span>
                      </>
                    )}
                  </button>
                </form>
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

          {abaAtiva === 'lembretes_whatsapp' && (
            <div className="space-y-4">
              {/* Card Educativo sobre Prevenção de Banimento e Regra de 3 Horas */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-600/40 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Bell className="w-4 h-4" />
                    </span>
                    <h4 className="font-bold text-sm text-white">
                      Lembretes Inteligentes de Reservas (1h e 15 minutos)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setExecutandoLimpeza(true);
                      const res = await verificarELiberarCotasExpiradas();
                      await onRecarregarDados();
                      setExecutandoLimpeza(false);
                      alert(
                        `Verificação concluída:\n• ${res.pedidosCancelados} reservas expiradas canceladas\n• ${res.cotasLiberadas} cotas liberadas para a grade.`
                      );
                    }}
                    disabled={executandoLimpeza}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${executandoLimpeza ? 'animate-spin' : ''}`} />
                    <span>Liberar Reservas &gt; 3h Agora</span>
                  </button>
                </div>

                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-emerald-300">🛡️ Proteção Anti-Banimento:</strong> A Meta (WhatsApp) bane chips comuns se usar robôs ou disparadores automáticos não oficiais de QR Code. Por isso, este painel calcula exatamente o momento de cada comprador e gera mensagens personalizadas com o nome da pessoa e o propósito missionário, permitindo que você envie com{' '}
                  <strong className="text-white">1 clique seguro</strong> pelo seu WhatsApp sem qualquer risco de bloqueio.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">⏰ Lembrete de 1 Hora:</strong>
                    Agradece a intenção, reforça a causa do Pr. Jocimar e envia o Pix Copia e Cola para pagamento fácil.
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <strong className="text-rose-400 block mb-0.5">⚠️ Alerta dos 15 Minutos Finais:</strong>
                    Avisa com amor cristão que faltam 15 minutos para as 3 horas se completarem e as cotas voltarem à grade.
                  </div>
                </div>
              </div>

              {/* Lista de Pedidos Pendentes e Status dos Lembretes */}
              {pedidosPendentes.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-400 space-y-2">
                  <CheckCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="font-bold text-white text-sm">Nenhuma reserva pendente no momento!</p>
                  <p className="text-xs">
                    Todas as cotas escolhidas já foram pagas ou estão liberadas na grade.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 font-semibold">
                    {pedidosPendentes.length}{' '}
                    {pedidosPendentes.length === 1 ? 'reserva aguardando pagamento' : 'reservas aguardando pagamento'}:
                  </p>

                  {pedidosPendentes.map((ped) => {
                    const agora = Date.now();
                    const criadoEm = new Date(ped.created_at).getTime();
                    const tempoDecorridoMs = agora - criadoEm;
                    const decorridoMinutos = Math.floor(tempoDecorridoMs / 60000);
                    const restanteMinutos = Math.max(0, 180 - decorridoMinutos); // 3h = 180 min

                    const cotasAssociadas = cotas
                      .filter((c) => c.pedido_id === ped.id)
                      .map((c) => c.numero);
                    const cotasFinais = cotasAssociadas.length > 0 ? cotasAssociadas : ped.cotas_numeros || [];

                    const whatsLimpo = ped.whatsapp.replace(/\D/g, '');
                    const whatsDestino = whatsLimpo.length >= 10 ? `55${whatsLimpo}` : '';

                    // Mensagens geradas pelas regras oficiais
                    const msg1h = gerarMensagemLembreteWhatsapp({
                      nome: ped.nome_comprador,
                      cotas: cotasFinais,
                      valor: ped.valor_total,
                      tipo: '1_hora',
                      pixCopiaECola: ped.pix_copia_cola || undefined,
                    });

                    const msg15m = gerarMensagemLembreteWhatsapp({
                      nome: ped.nome_comprador,
                      cotas: cotasFinais,
                      valor: ped.valor_total,
                      tipo: '15_minutos',
                      pixCopiaECola: ped.pix_copia_cola || undefined,
                    });

                    // Classificação do momento
                    const isExpirado = restanteMinutos <= 0;
                    const isFaltando15 = !isExpirado && restanteMinutos <= 15;
                    const isMaisDe1Hora = !isExpirado && decorridoMinutos >= 60;

                    return (
                      <div
                        key={ped.id}
                        className={`p-4 rounded-2xl border transition space-y-3 ${
                          isExpirado
                            ? 'bg-rose-950/30 border-rose-800/50'
                            : isFaltando15
                            ? 'bg-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/30'
                            : isMaisDe1Hora
                            ? 'bg-slate-950/90 border-blue-500/40'
                            : 'bg-slate-950/80 border-slate-800'
                        }`}
                      >
                        {/* Linha de Identificação & Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-white text-sm">
                                {ped.nome_comprador}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                ({mascararWhatsApp(ped.whatsapp)})
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {ped.quantidade_cotas} cotas: {cotasFinais.map((n) => formatarNumeroCota(n)).join(', ')} •{' '}
                              <strong className="text-emerald-400">{formatarMoeda(ped.valor_total)}</strong>
                            </p>
                          </div>

                          {/* Tag de Tempo e Momento */}
                          <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                            {isExpirado ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-900/80 text-rose-200 border border-rose-700">
                                ❌ Expirado (&gt; 3h)
                              </span>
                            ) : isFaltando15 ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-500 text-white animate-pulse">
                                🚨 Faltam {restanteMinutos} min para liberar!
                              </span>
                            ) : isMaisDe1Hora ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-900/80 text-blue-200 border border-blue-700">
                                ⏳ {decorridoMinutos} min decorridos (Lembrete Ideal)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                                🌱 Reserva Recente ({decorridoMinutos} min)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões de Ação Direta no WhatsApp (1-Clique Seguro) */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                          {whatsDestino && (
                            <>
                              <a
                                href={`https://wa.me/${whatsDestino}?text=${encodeURIComponent(msg1h)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                                title="Enviar mensagem fraterna de lembrete de 1 hora"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Lembrete 1h (WhatsApp)</span>
                              </a>

                              <a
                                href={`https://wa.me/${whatsDestino}?text=${encodeURIComponent(msg15m)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                                title="Enviar aviso urgente de que faltam 15 minutos para liberação das cotas"
                              >
                                <Clock3 className="w-3.5 h-3.5" />
                                <span>Alerta Urgente 15min (WhatsApp)</span>
                              </a>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(msg1h);
                              setCopiouMsgId(ped.id);
                              setTimeout(() => setCopiouMsgId(null), 3000);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center space-x-1 transition cursor-pointer"
                          >
                            {copiouMsgId === ped.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Texto</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              await handleMarcarComoPago(ped.id);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 font-bold text-xs flex items-center space-x-1 transition cursor-pointer ml-auto"
                            title="Confirmar pagamento deste pedido"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Confirmar Pago</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Deseja realmente cancelar a reserva e liberar as cotas de ${ped.nome_comprador}?`)) {
                                await handleCancelarPedido(ped.id);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-950/60 font-semibold text-xs transition cursor-pointer"
                            title="Cancelar reserva imediatamente"
                          >
                            Liberar Cotas
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

          {abaAtiva === 'logs_auditoria' && (
            <AuditLogsViewer onRefreshData={onRecarregarDados} />
          )}
        </div>
      </div>
    </div>
  );
};

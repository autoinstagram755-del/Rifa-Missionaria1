import React, { useState } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  Lock,
  AlertCircle,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  calcularValorTotal,
  formatarMoeda,
  formatarNumeroCota,
  mascararCPF,
  mascararWhatsApp,
  validarCPF,
  validarWhatsApp,
  gerarPixBacen,
  CHAVE_PIX_OFICIAL,
  CHAVE_PIX_FORMATADA,
  NOME_TITULAR_PIX,
  CIDADE_PIX,
} from '../utils/rules.ts';
import { supabase } from '../lib/supabase.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotasEscolhidas: number[];
  quantidadeDesejada: number;
  onSuccessCheckout: (dadosResposta: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cotasEscolhidas,
  quantidadeDesejada,
  onSuccessCheckout,
}) => {
  const qtdCotas = cotasEscolhidas.length > 0 ? cotasEscolhidas.length : quantidadeDesejada;
  const valorTotal = calcularValorTotal(qtdCotas);

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao'>('pix');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(mascararCPF(e.target.value));
    if (erro) setErro(null);
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(mascararWhatsApp(e.target.value));
    if (erro) setErro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    // Validações
    if (!nome.trim() || nome.trim().length < 3) {
      setErro('Por favor, informe seu nome completo.');
      return;
    }

    if (!validarWhatsApp(whatsapp)) {
      setErro('Por favor, informe um número de WhatsApp válido com DDD.');
      return;
    }

    if (!validarCPF(cpf)) {
      setErro('CPF inválido. O CPF é obrigatório para a emissão do Pix e identificação do ganhador.');
      return;
    }

    setCarregando(true);

    let data: any = null;

    try {
      const response = await fetch('/api/criar-pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          cpf: cpf.replace(/\D/g, ''),
          quantidadeCotas: qtdCotas,
          numerosEscolhidos: cotasEscolhidas.length > 0 ? cotasEscolhidas : undefined,
          metodo: metodoPagamento,
        }),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Se a API recusou com validação ou cota já ocupada, mostra o erro exato e interrompe
        setErro(resJson.error || 'Erro ao processar reserva. Por favor, tente novamente.');
        setCarregando(false);
        return;
      }

      data = resJson;
    } catch (netErr) {
      console.warn('API /api/criar-pagamento inacessível, acionando reserva direta no Supabase:', netErr);
    }

    // Se a API retornou com sucesso, finaliza
    if (data && data.success) {
      setCarregando(false);
      onSuccessCheckout({
        ...data,
        metodo: metodoPagamento,
      });
      return;
    }

    // FALLBACK DE ALTA RESILIÊNCIA: Conexão Direta com Supabase (Client-Side)
    // Garante que NENHUM pedido de campanha de tráfego seja perdido mesmo com falha na API da Vercel
    try {
      const cpfLimpo = cpf.replace(/\D/g, '');
      const pedidoId = crypto.randomUUID();
      let cotasFinais: number[] = [];

      // 1. Se o comprador escolheu números específicos
      if (cotasEscolhidas.length === qtdCotas) {
        const { data: cotasDb, error: errVerif } = await supabase
          .from('cotas')
          .select('numero, status')
          .in('numero', cotasEscolhidas);

        if (errVerif) {
          throw new Error('Falha ao verificar disponibilidade no banco de dados.');
        }

        const indisponiveis = (cotasDb || []).filter((c) => c.status !== 'disponivel');
        if (indisponiveis.length > 0) {
          setErro(
            `As seguintes cotas acabaram de ser escolhidas por outro comprador: ${indisponiveis
              .map((c) => formatarNumeroCota(c.numero))
              .join(', ')}. Por favor, escolha outros números.`
          );
          setCarregando(false);
          return;
        }
        cotasFinais = [...cotasEscolhidas].sort((a, b) => a - b);
      } else {
        // Busca primeiras cotas livres
        const { data: livresDb, error: errLivres } = await supabase
          .from('cotas')
          .select('numero')
          .eq('status', 'disponivel')
          .order('numero', { ascending: true })
          .limit(qtdCotas);

        if (errLivres || !livresDb || livresDb.length < qtdCotas) {
          setErro(`Desculpe, não há ${qtdCotas} cotas livres disponíveis no momento.`);
          setCarregando(false);
          return;
        }
        cotasFinais = livresDb.map((c) => c.numero);
      }

      // 2. Registra o pedido no Supabase
      const { error: errPedido } = await supabase.from('pedidos').insert({
        id: pedidoId,
        nome_comprador: nome.trim(),
        whatsapp: whatsapp.trim(),
        cpf: cpfLimpo,
        valor_total: valorTotal,
        quantidade_cotas: qtdCotas,
        status_pagamento: 'pendente',
        created_at: new Date().toISOString(),
      });

      if (errPedido) {
        throw new Error('Erro ao salvar pedido no banco de dados: ' + errPedido.message);
      }

      // 3. Atualiza as cotas para reservado no Supabase
      const { error: errCotas } = await supabase
        .from('cotas')
        .update({
          status: 'reservado',
          pedido_id: pedidoId,
        })
        .in('numero', cotasFinais);

      if (errCotas) {
        throw new Error('Erro ao reservar cotas no banco de dados.');
      }

      // 4. Gera código Pix Oficial Banco Central
      const txid = pedidoId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
      const pixOficial = gerarPixBacen(
        CHAVE_PIX_OFICIAL,
        NOME_TITULAR_PIX,
        CIDADE_PIX,
        valorTotal,
        txid
      );

      setCarregando(false);
      onSuccessCheckout({
        success: true,
        pedido_id: pedidoId,
        nome_comprador: nome.trim(),
        whatsapp: whatsapp.trim(),
        cpf: cpfLimpo,
        valor_total: valorTotal,
        quantidade_cotas: qtdCotas,
        cotas_numeros: cotasFinais,
        status: 'pendente',
        metodo: metodoPagamento,
        pix_copia_cola: pixOficial,
        pix_qr_code_url: '',
        chave_pix: CHAVE_PIX_OFICIAL,
        chave_pix_formatada: CHAVE_PIX_FORMATADA,
        titular_pix: NOME_TITULAR_PIX,
        checkout_url: `https://checkout.infinitepay.io/jocimar-silva-128?amount=${Math.round(valorTotal * 100)}&order_nsu=${pedidoId}`,
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      });
    } catch (fallbackErr: any) {
      console.error('Falha crítica na reserva:', fallbackErr);
      setCarregando(false);
      setErro(
        fallbackErr.message ||
          'Não foi possível registrar sua reserva no momento. Por favor, verifique sua conexão ou fale conosco no WhatsApp.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-white my-8">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          disabled={carregando}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            <Lock className="w-3.5 h-3.5" />
            <span>CHECKOUT 100% SEGURO</span>
          </div>
          <h3 className="text-2xl font-extrabold text-white">Finalizar Participação</h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Preencha seus dados para vincular as cotas ao seu nome e gerar o pagamento.
          </p>
        </div>

        {/* Resumo do Pedido */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400">Quantidade de Cotas:</span>
            <span className="font-bold text-white font-mono">{qtdCotas} cotas</span>
          </div>

          {cotasEscolhidas.length > 0 && (
            <div className="flex items-start justify-between text-xs sm:text-sm pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Números Escolhidos:</span>
              <span className="font-bold text-amber-300 font-mono text-right max-w-[240px] truncate">
                {cotasEscolhidas.map((n) => formatarNumeroCota(n)).join(', ')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm sm:text-base pt-2 border-t border-slate-800">
            <span className="font-semibold text-slate-200">Total a Contribuir:</span>
            <span className="text-xl font-black text-amber-400">{formatarMoeda(valorTotal)}</span>
          </div>
        </div>

        {/* Seletor de Método de Pagamento */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMetodoPagamento('pix')}
            className={`p-3 rounded-2xl border flex items-center justify-center space-x-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
              metodoPagamento === 'pix'
                ? 'bg-amber-400/10 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Pix Instantâneo</span>
          </button>

          <button
            type="button"
            onClick={() => setMetodoPagamento('cartao')}
            className={`p-3 rounded-2xl border flex items-center justify-center space-x-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
              metodoPagamento === 'cartao'
                ? 'bg-blue-500/10 border-blue-400 text-blue-300 ring-1 ring-blue-400/50'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span>Cartão de Crédito</span>
          </button>
        </div>

        {/* Alerta de Erro */}
        {erro && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome Completo <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Silva de Souza"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp com DDD <span className="text-amber-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={handleWhatsappChange}
                placeholder="(61) 98765-4321"
                maxLength={15}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                CPF (Obrigatório InfinitePay) <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3.5 px-6 rounded-xl font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-400/25 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50 text-base"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    {metodoPagamento === 'cartao'
                      ? 'Reservando Cotas & Preparando Cartão...'
                      : 'Reservando Cotas & Gerando Pix...'}
                  </span>
                </>
              ) : metodoPagamento === 'pix' ? (
                <>
                  <QrCode className="w-5 h-5" />
                  <span>Pagar via Pix (Instantâneo)</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Pagar no Cartão de Crédito (em até 12x)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Seus dados são protegidos e usados apenas para registro das cotas.</span>
          </div>
        </form>
      </div>
    </div>
  );
};

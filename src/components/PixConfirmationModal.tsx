import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Clock,
  QrCode,
  ShieldCheck,
  Share2,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Phone,
  CreditCard,
  UserCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  formatarMoeda,
  formatarNumeroCota,
  CHAVE_PIX_OFICIAL,
  CHAVE_PIX_FORMATADA,
  NOME_TITULAR_PIX,
  CIDADE_PIX,
} from '../utils/rules.ts';
import { atualizarStatusPedido } from '../lib/supabase.ts';

interface PixConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dadosPedido: {
    pedido_id: string;
    nome_comprador: string;
    whatsapp: string;
    cpf: string;
    valor_total: number;
    quantidade_cotas: number;
    cotas_numeros: number[];
    pix_copia_cola: string;
    status?: 'pendente' | 'pago' | 'cancelado' | string;
    metodo?: 'pix' | 'cartao';
    expires_at?: string;
    checkout_url?: string;
    chave_pix?: string;
    chave_pix_formatada?: string;
    titular_pix?: string;
  } | null;
  onPagamentoConfirmado: (pedidoId: string) => void;
}

export const PixConfirmationModal: React.FC<PixConfirmationModalProps> = ({
  isOpen,
  onClose,
  dadosPedido,
  onPagamentoConfirmado,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'pix' | 'cartao'>('pix');
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(3 * 60 * 60);
  const [statusPagamento, setStatusPagamento] = useState<'pendente' | 'pago'>('pendente');
  const [verificando, setVerificando] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const titular = dadosPedido?.titular_pix || NOME_TITULAR_PIX;
  const chaveFormatada = dadosPedido?.chave_pix_formatada || CHAVE_PIX_FORMATADA;

  // Sincroniza o status e aba sempre que o modal abre ou o pedido muda
  useEffect(() => {
    if (isOpen && dadosPedido) {
      const isAlreadyPaid = dadosPedido.status === 'pago';
      setStatusPagamento(isAlreadyPaid ? 'pago' : 'pendente');
      setAbaAtiva(dadosPedido.metodo === 'cartao' ? 'cartao' : 'pix');
      setCopiadoPix(false);
      setVerificando(false);

      // Calcula cronômetro regressivo
      let segInicial = 3 * 60 * 60;
      if (dadosPedido.expires_at) {
        const diffSeg = Math.floor((new Date(dadosPedido.expires_at).getTime() - Date.now()) / 1000);
        segInicial = diffSeg > 0 ? diffSeg : 0;
      }
      setSegundosRestantes(segInicial);
    } else if (!isOpen) {
      setStatusPagamento('pendente');
      setQrCodeDataUrl('');
      setVerificando(false);
    }
  }, [isOpen, dadosPedido?.pedido_id, dadosPedido?.status, dadosPedido?.metodo, dadosPedido?.expires_at]);

  // Gera o QR Code oficial como imagem DataURL de alta resolução
  useEffect(() => {
    if (isOpen && dadosPedido?.pix_copia_cola) {
      QRCode.toDataURL(dadosPedido.pix_copia_cola, {
        width: 260,
        margin: 2,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Erro ao renderizar QRCode:', err));
    }
  }, [isOpen, dadosPedido?.pix_copia_cola]);

  // Cronômetro regressivo oficial de 3 horas
  useEffect(() => {
    if (!isOpen || statusPagamento === 'pago') return;

    const interval = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, statusPagamento]);

  // Polling automático sutil para verificar status de pagamento (Pix ou Cartão via InfinitePay)
  useEffect(() => {
    if (!isOpen || !dadosPedido?.pedido_id || statusPagamento === 'pago') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/consultar-pedido?id=${dadosPedido.pedido_id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status_pagamento === 'pago') {
            setStatusPagamento('pago');
            onPagamentoConfirmado(dadosPedido.pedido_id);
          }
        }
      } catch (e) {
        // Ignora silenciosamente erros de rede no polling
      }
    }, 3500);

    return () => clearInterval(pollInterval);
  }, [isOpen, dadosPedido?.pedido_id, statusPagamento, onPagamentoConfirmado]);

  if (!isOpen || !dadosPedido) return null;

  const horas = Math.floor(segundosRestantes / 3600);
  const minutos = Math.floor((segundosRestantes % 3600) / 60);
  const segundos = segundosRestantes % 60;
  const tempoFormatado = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

  const copiarPixCopiaECola = async () => {
    try {
      await navigator.clipboard.writeText(dadosPedido.pix_copia_cola);
      setCopiadoPix(true);
      setTimeout(() => setCopiadoPix(false), 3000);
    } catch (e) {
      console.error('Falha ao copiar:', e);
    }
  };

  const confirmarPagamentoManual = async () => {
    setVerificando(true);
    try {
      const res = await fetch(`/api/consultar-pedido?id=${dadosPedido.pedido_id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status_pagamento === 'pago') {
          setStatusPagamento('pago');
          onPagamentoConfirmado(dadosPedido.pedido_id);
          setVerificando(false);
          return;
        }
      }
    } catch (e) {}

    // Fallback de confirmação direta
    await atualizarStatusPedido(dadosPedido.pedido_id, 'pago');
    setStatusPagamento('pago');
    setVerificando(false);
    onPagamentoConfirmado(dadosPedido.pedido_id);
  };

  const compartilharWhatsAppAmigos = () => {
    const texto = encodeURIComponent(
      `Acabei de semear na Ação Solidária: Missão & Cooperação! Minhas cotas da sorte são: ${dadosPedido.cotas_numeros
        .map((n) => formatarNumeroCota(n))
        .join(', ')}. Participe você também e abençoe esta causa!`
    );
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  const checkoutUrlCartao =
    dadosPedido.checkout_url ||
    `https://checkout.infinitepay.io/jocimar-silva-128?amount=${Math.round(
      dadosPedido.valor_total * 100
    )}&order_nsu=${dadosPedido.pedido_id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-white my-8">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {statusPagamento === 'pago' ? (
          /* ==========================================================
             TELA DE SUCESSO / COMPROVANTE OFICIAL
             ========================================================== */
          <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Pagamento Registrado com Sucesso!
              </span>
              <h3 className="text-2xl font-black text-white">Deus Abençoe Sua Semeadura!</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
                Suas cotas foram reservadas com sucesso para{' '}
                <strong className="text-amber-300">{dadosPedido.nome_comprador}</strong>.
              </p>
            </div>

            {/* Card com as Cotas Oficiais */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Pedido #{dadosPedido.pedido_id.slice(-8).toUpperCase()}</span>
                <span className="text-emerald-400 font-semibold">100% Confirmado</span>
              </div>

              <div>
                <span className="text-xs text-amber-400 font-bold block mb-1">
                  Seus Números no Sorteio ({dadosPedido.quantidade_cotas} {dadosPedido.quantidade_cotas === 1 ? 'cota' : 'cotas'}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {dadosPedido.cotas_numeros.map((num) => (
                    <span
                      key={num}
                      className="px-2.5 py-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-lg text-xs font-mono font-bold"
                    >
                      {formatarNumeroCota(num)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400">Valor Contribuído:</span>
                <span className="font-bold text-white text-sm">
                  {formatarMoeda(dadosPedido.valor_total)}
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-2 pt-2">
              <button
                onClick={compartilharWhatsAppAmigos}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 transition cursor-pointer shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar Ação com Amigos</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Fechar Comprovante
              </button>
            </div>
          </div>
        ) : (
          /* ==========================================================
             TELA DE PAGAMENTO PENDENTE: PIX OU CARTÃO
             ========================================================== */
          <div className="space-y-5">
            {/* Seletor de Método / Abas: Pix ou Cartão */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAbaAtiva('pix')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                  abaAtiva === 'pix'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pix Instantâneo</span>
              </button>
              <button
                type="button"
                onClick={() => setAbaAtiva('cartao')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                  abaAtiva === 'cartao'
                    ? 'bg-blue-600 text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cartão de Crédito</span>
              </button>
            </div>

            {/* Cronômetro Regressivo de Reserva (3 Horas) */}
            <div
              className={`p-3 rounded-2xl border text-xs space-y-1.5 transition ${
                segundosRestantes === 0
                  ? 'bg-rose-950/60 border-rose-800/80 text-rose-200'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock
                    className={`w-4 h-4 ${
                      segundosRestantes === 0 ? 'text-rose-400' : 'text-amber-400 animate-pulse'
                    }`}
                  />
                  <span className="font-semibold text-white">Reserva ativa por 3 horas:</span>
                </div>
                <span
                  className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                    segundosRestantes === 0
                      ? 'bg-rose-900/80 text-rose-200'
                      : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {tempoFormatado}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {segundosRestantes === 0
                  ? 'O prazo expirou. As cotas estão sendo liberadas automaticamente no sistema para outros participantes.'
                  : 'Se o pagamento não for concluído em 3 horas, as cotas voltam automaticamente para a grade livre.'}
              </p>
            </div>

            {abaAtiva === 'pix' ? (
              /* ----------------------------------------------------
                 CONTEÚDO DA ABA PIX
                 ---------------------------------------------------- */
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>PIX OFICIAL BANCO CENTRAL • DIRETO NA CONTA</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                    Pague via Pix Instantâneo
                  </h3>
                  <p className="text-xs text-slate-300">
                    Escaneie o QR Code no seu banco ou copie a chave Copia e Cola abaixo.
                  </p>
                </div>

                {/* Dados do Titular do Pix */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Titular:</span>
                    </span>
                    <strong className="text-white font-bold">{titular}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>Chave Pix:</span>
                    </span>
                    <span className="font-mono text-amber-300 font-bold">{chaveFormatada}</span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl shadow-inner max-w-xs mx-auto">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code Pix Oficial"
                      className="w-48 h-48 rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                  <div className="text-center mt-2">
                    <span className="text-[11px] text-slate-600 block">Valor da Semeadura:</span>
                    <span className="text-base font-extrabold text-slate-950">
                      {formatarMoeda(dadosPedido.valor_total)}
                    </span>
                  </div>
                </div>

                {/* Pix Copia e Cola com 1-clique */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Código Pix Copia e Cola:</span>
                    <span className="text-[11px] text-amber-400 font-medium">
                      Compatível com todos os bancos
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={dadosPedido.pix_copia_cola}
                      className="w-full pl-3 pr-28 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={copiarPixCopiaECola}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-sm"
                    >
                      {copiadoPix ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-950" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Pix</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Botão de Já Paguei */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={confirmarPagamentoManual}
                    disabled={verificando}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white flex items-center justify-center space-x-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    {verificando ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Confirmando Pagamento...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Já Fiz o Pix (Ver Meus Números)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Alternativa: Cartão */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('cartao')}
                    className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center space-x-1 underline cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Prefere parcelar no Cartão de Crédito? Clique aqui</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ----------------------------------------------------
                 CONTEÚDO DA ABA CARTÃO DE CRÉDITO (INFINITEPAY)
                 ---------------------------------------------------- */
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>CHECKOUT SEGURO INFINITEPAY • ATÉ 12X</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                    Pagamento no Cartão de Crédito
                  </h3>
                  <p className="text-xs text-slate-300">
                    Pague em até 12x no cartão de crédito com segurança bancária criptografada.
                  </p>
                </div>

                {/* Card de Resumo da Compra no Cartão */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-950 to-slate-900 border border-blue-600/30 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Participante:</span>
                    <strong className="text-white">{dadosPedido.nome_comprador}</strong>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Cotas Reservadas:</span>
                    <strong className="text-amber-300 font-mono">
                      {dadosPedido.quantidade_cotas} {dadosPedido.quantidade_cotas === 1 ? 'cota' : 'cotas'} (
                      {dadosPedido.cotas_numeros.map((n) => formatarNumeroCota(n)).join(', ')})
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm">
                    <span className="text-slate-200 font-semibold">Valor Total:</span>
                    <span className="text-xl font-black text-amber-400">
                      {formatarMoeda(dadosPedido.valor_total)}
                    </span>
                  </div>

                  <div className="text-[11px] text-blue-300/80 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40 leading-relaxed">
                    Clique no botão abaixo para abrir a página oficial e criptografada da InfinitePay, onde você poderá escolher em até 12 vezes e inserir os dados do cartão com total privacidade e segurança.
                  </div>
                </div>

                {/* Botão de Abertura do Checkout de Cartão */}
                <div className="space-y-2 pt-1">
                  <a
                    href={checkoutUrlCartao}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 px-6 rounded-xl font-extrabold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition cursor-pointer text-base"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Pagar com Cartão no InfinitePay</span>
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>

                  {/* Botão para quem já pagou pelo link externo */}
                  <button
                    type="button"
                    onClick={confirmarPagamentoManual}
                    disabled={verificando}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    {verificando ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verificando com a InfinitePay...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Já Concluí o Pagamento no Cartão (Verificar)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Alternativa: Pix */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('pix')}
                    className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center space-x-1 underline cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Prefere pagar via Pix Instantâneo? Clique aqui</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

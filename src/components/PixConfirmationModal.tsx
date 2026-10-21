import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Clock,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Share2,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { formatarMoeda, formatarNumeroCota } from '../utils/rules.ts';
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
    expires_at?: string;
    checkout_url?: string;
  } | null;
  onPagamentoConfirmado: (pedidoId: string) => void;
}

export const PixConfirmationModal: React.FC<PixConfirmationModalProps> = ({
  isOpen,
  onClose,
  dadosPedido,
  onPagamentoConfirmado,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(15 * 60);
  const [statusPagamento, setStatusPagamento] = useState<'pendente' | 'pago'>('pendente');
  const [verificando, setVerificando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Renderiza o QR Code no Canvas
  useEffect(() => {
    if (isOpen && dadosPedido?.pix_copia_cola && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        dadosPedido.pix_copia_cola,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#020617',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Erro ao renderizar QRCode:', error);
        }
      );
    }
  }, [isOpen, dadosPedido?.pix_copia_cola]);

  // Cronômetro regressivo de 15 minutos
  useEffect(() => {
    if (!isOpen || statusPagamento === 'pago') return;

    setSegundosRestantes(15 * 60);
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

  // Polling automático sutil para verificar se webhook confirmou
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
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [isOpen, dadosPedido?.pedido_id, statusPagamento, onPagamentoConfirmado]);

  if (!isOpen || !dadosPedido) return null;

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  const tempoFormatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

  const copiarChave = async () => {
    try {
      await navigator.clipboard.writeText(dadosPedido.pix_copia_cola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch (e) {
      console.error('Falha ao copiar:', e);
    }
  };

  const simularPagamentoAprovado = async () => {
    setVerificando(true);
    await atualizarStatusPedido(dadosPedido.pedido_id, 'pago');
    setStatusPagamento('pago');
    setVerificando(false);
    onPagamentoConfirmado(dadosPedido.pedido_id);
  };

  const compartilharWhatsApp = () => {
    const texto = encodeURIComponent(
      `Acabei de semear na Ação Solidária: Missão & Cooperação! Minhas cotas da sorte são: ${dadosPedido.cotas_numeros
        .map((n) => formatarNumeroCota(n))
        .join(', ')}. Participe você também e abençoe esta causa!`
    );
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

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
          /* TELA DE SUCESSO / COMPROVANTE */
          <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Pagamento Confirmado com Sucesso!
              </span>
              <h3 className="text-2xl font-black text-white">Deus Abençoe Sua Semeadura!</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
                Suas cotas foram registradas com sucesso em nome de{' '}
                <strong className="text-amber-300">{dadosPedido.nome_comprador}</strong>.
              </p>
            </div>

            {/* Card com as Cotas Oficiais */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Pedido #{dadosPedido.pedido_id.slice(-8).toUpperCase()}</span>
                <span className="text-emerald-400 font-semibold">100% Quitada</span>
              </div>

              <div>
                <span className="text-xs text-amber-400 font-bold block mb-1">
                  Seus Números no Sorteio ({dadosPedido.quantidade_cotas} cotas):
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
                onClick={compartilharWhatsApp}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 transition cursor-pointer shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar no WhatsApp</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Fechar Comprovante
              </button>
            </div>
          </div>
        ) : (
          /* TELA DE PAGAMENTO PIX */
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                <QrCode className="w-3.5 h-3.5" />
                <span>PIX INFINITEPAY • PAGAMENTO INSTANTÂNEO</span>
              </div>
              <h3 className="text-2xl font-extrabold text-white">Efetue o Pagamento Pix</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Escaneie o QR Code no app do seu banco ou use a chave Copia e Cola abaixo.
              </p>
            </div>

            {/* Cronômetro */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex items-center space-x-2 text-slate-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Tempo restante para pagar:</span>
              </div>
              <span className="font-mono font-bold text-amber-400 text-sm">{tempoFormatado}</span>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner max-w-xs mx-auto">
              <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
              <span className="text-[11px] font-semibold text-slate-900 mt-2 text-center">
                Valor: <strong>{formatarMoeda(dadosPedido.valor_total)}</strong>
              </span>
            </div>

            {/* Pix Copia e Cola */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Código Pix Copia e Cola:</span>
                <span className="text-[11px] text-amber-400 font-medium">1-clique para copiar</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={dadosPedido.pix_copia_cola}
                  className="w-full pl-3 pr-28 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copiarChave}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-sm"
                >
                  {copiado ? (
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

            {/* Resumo das Cotas Reservadas */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Cotas Reservadas:</span>
                <span className="font-mono text-amber-300 font-bold max-w-[200px] truncate">
                  {dadosPedido.cotas_numeros.map((n) => formatarNumeroCota(n)).join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Titular:</span>
                <span>{dadosPedido.nome_comprador}</span>
              </div>
            </div>

            {/* Botão para Abrir Checkout Oficial da InfinitePay (Cartão ou Pix) */}
            {dadosPedido.checkout_url && (
              <div className="pt-1">
                <a
                  href={dadosPedido.checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center space-x-2 transition cursor-pointer shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Pagar no Cartão ou App InfinitePay</span>
                </a>
              </div>
            )}

            {/* Botão de Verificação & Simulação de Teste */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={simularPagamentoAprovado}
                disabled={verificando}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 flex items-center justify-center space-x-2 transition cursor-pointer"
                title="Simula o retorno instantâneo do Webhook da InfinitePay para testar o fluxo de ponta a ponta"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Simular Confirmação Pix (Modo Teste)</span>
              </button>

              <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
                <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
                <span>Aguardando confirmação automática via Webhook InfinitePay...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

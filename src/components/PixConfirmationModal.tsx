import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Clock,
  QrCode,
  ShieldCheck,
  Share2,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Phone,
  CreditCard,
  UserCheck,
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
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(15 * 60);
  const [statusPagamento, setStatusPagamento] = useState<'pendente' | 'pago'>('pendente');
  const [verificando, setVerificando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const titular = dadosPedido?.titular_pix || NOME_TITULAR_PIX;
  const chaveFormatada = dadosPedido?.chave_pix_formatada || CHAVE_PIX_FORMATADA;
  const chaveNumeros = dadosPedido?.chave_pix || CHAVE_PIX_OFICIAL;

  // Renderiza o QR Code no Canvas
  useEffect(() => {
    if (isOpen && dadosPedido?.pix_copia_cola && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        dadosPedido.pix_copia_cola,
        {
          width: 210,
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

  // Polling automático sutil para verificar status no Supabase
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
          /* TELA DE PAGAMENTO PIX OFICIAL */
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                <QrCode className="w-3.5 h-3.5" />
                <span>PIX OFICIAL BANCO CENTRAL • DIRETO NA CONTA</span>
              </div>
              <h3 className="text-2xl font-extrabold text-white">Efetue o Pagamento Pix</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Escaneie o QR Code no app do seu banco ou use a chave Copia e Cola.
              </p>
            </div>

            {/* Cronômetro */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex items-center space-x-2 text-slate-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Tempo restante para pagar:</span>
              </div>
              <span className="font-mono font-bold text-amber-400 text-sm">{tempoFormatado}</span>
            </div>

            {/* Dados do Titular do Pix (Transparência Total) */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Titular da Conta:</span>
                </span>
                <strong className="text-white font-bold">{titular}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chave Pix Cadastrada:</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">{chaveFormatada}</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl shadow-inner max-w-xs mx-auto">
              <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
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
                <span className="text-[11px] text-amber-400 font-medium">Compatível com todos os bancos</span>
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
                    <span>Já Fiz o Pagamento (Ver Meus Números)</span>
                  </>
                )}
              </button>
            </div>

            {/* O Melhor dos 2 Mundos: Opção Cartão de Crédito via InfinitePay */}
            {dadosPedido.checkout_url && (
              <div className="pt-2 border-t border-slate-800">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-600/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 text-left">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Prefere pagar com Cartão de Crédito?
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Pague em até 12x com segurança pela InfinitePay
                      </span>
                    </div>
                  </div>

                  <a
                    href={dadosPedido.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                  >
                    <span>Pagar no Cartão</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

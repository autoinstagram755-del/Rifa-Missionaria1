import React, { useState } from 'react';
import { X, Search, CheckCircle, Clock, ShieldCheck, AlertCircle, Copy, Check, MessageSquare, Loader2 } from 'lucide-react';
import { Pedido, Cota, supabase } from '../lib/supabase.ts';
import { formatarMoeda, formatarNumeroCota, mascararCPF, mascararWhatsApp, TEMPO_EXPIRACAO_RESERVA_MS, WHATSAPP_SUPORTE_NUMERO } from '../utils/rules.ts';

interface CheckOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidos: Pedido[];
  cotas: Cota[];
}

export const CheckOrderModal: React.FC<CheckOrderModalProps> = ({
  isOpen,
  onClose,
  pedidos,
  cotas,
}) => {
  const [documentoOuId, setDocumentoOuId] = useState('');
  const [consultado, setConsultado] = useState(false);
  const [copiouPedidoId, setCopiouPedidoId] = useState<string | null>(null);
  const [pedidosLive, setPedidosLive] = useState<Pedido[]>([]);
  const [buscandoDb, setBuscandoDb] = useState(false);

  if (!isOpen) return null;

  const termoLimpo = documentoOuId.replace(/\D/g, '');

  const listaCompleta = [...pedidos, ...pedidosLive.filter((pl) => !pedidos.some((p) => p.id === pl.id))];

  const pedidosEncontrados = listaCompleta.filter((p) => {
    if (!termoLimpo && !documentoOuId.trim()) return false;
    const cpfPedidoLimpo = p.cpf.replace(/\D/g, '');
    const whatsPedidoLimpo = p.whatsapp.replace(/\D/g, '');
    const numeroCota = parseInt(termoLimpo, 10);
    const temCota = !isNaN(numeroCota) && p.cotas_numeros?.includes(numeroCota);
    const nomeBate = p.nome_comprador.toLowerCase().includes(documentoOuId.trim().toLowerCase());

    return (
      (termoLimpo && (cpfPedidoLimpo.includes(termoLimpo) || whatsPedidoLimpo.includes(termoLimpo))) ||
      p.id.toLowerCase().includes(documentoOuId.trim().toLowerCase()) ||
      temCota ||
      (documentoOuId.trim().length >= 3 && nomeBate)
    );
  });

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsultado(true);
    setBuscandoDb(true);

    try {
      const numCota = parseInt(termoLimpo, 10);
      const ehBuscaCota = !isNaN(numCota) && numCota >= 1 && numCota <= 500 && termoLimpo.length <= 3;

      // 1. Se digitou um número de cota específico (ex: 35 ou 035 ou 71)
      if (ehBuscaCota) {
        const { data: cotaData } = await supabase
          .from('cotas')
          .select('numero, status, pedido_id, pedidos(*, cotas(numero, status))')
          .eq('numero', numCota)
          .maybeSingle();

        if (cotaData?.pedidos) {
          const pedObj = cotaData.pedidos as any;
          const formatado: Pedido = {
            ...pedObj,
            cotas_numeros:
              pedObj.cotas && Array.isArray(pedObj.cotas) && pedObj.cotas.length > 0
                ? pedObj.cotas.map((c: any) => c.numero).sort((a: number, b: number) => a - b)
                : [numCota],
          };
          setPedidosLive([formatado]);
          setBuscandoDb(false);
          return;
        }
      }

      // 2. Busca direta no Supabase por CPF, WhatsApp, Nome ou ID
      let query = supabase.from('pedidos').select('*, cotas(numero, status)');
      if (termoLimpo.length >= 3) {
        query = query.or(`cpf.ilike.%${termoLimpo}%,whatsapp.ilike.%${termoLimpo}%`);
      } else if (documentoOuId.trim().length >= 2) {
        query = query.ilike('nome_comprador', `%${documentoOuId.trim()}%`);
      }

      const { data } = await query.limit(10);
      if (data && data.length > 0) {
        const formatados = data.map((p: any) => ({
          ...p,
          cotas_numeros:
            p.cotas && Array.isArray(p.cotas) && p.cotas.length > 0
              ? p.cotas.map((c: any) => c.numero).sort((a: number, b: number) => a - b)
              : p.cotas_numeros || [],
        })) as Pedido[];
        setPedidosLive(formatados);
      }
    } catch (err) {
      console.warn('Erro na busca live do pedido:', err);
    } finally {
      setBuscandoDb(false);
    }
  };

  const copiarNumerosCotas = async (pedidoId: string, numeros: number[]) => {
    try {
      const texto = `Minhas Cotas da Ação Solidária: ${numeros.map((n) => formatarNumeroCota(n)).join(', ')}`;
      await navigator.clipboard.writeText(texto);
      setCopiouPedidoId(pedidoId);
      setTimeout(() => setCopiouPedidoId(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-white my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            <Search className="w-3.5 h-3.5" />
            <span>LOCALIZAR MINHAS COTAS</span>
          </div>
          <h3 className="text-2xl font-extrabold text-white">Consultar Participação</h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Digite seu CPF, WhatsApp ou número de cota para consultar o comprovante oficial.
          </p>
        </div>

        <form onSubmit={handleBuscar} className="mt-5 flex gap-2">
          <input
            type="text"
            required
            value={documentoOuId}
            onChange={(e) => {
              setDocumentoOuId(e.target.value);
              setConsultado(false);
            }}
            placeholder="Digite CPF, WhatsApp ou nº da cota..."
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-xl transition cursor-pointer shrink-0"
          >
            Buscar
          </button>
        </form>

        {consultado && (
          <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {pedidosEncontrados.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="font-semibold text-slate-200 text-sm">Nenhuma cota encontrada</p>
                <p>Verifique se os dígitos do CPF ou telefone coincidem com o cadastro realizado.</p>
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${WHATSAPP_SUPORTE_NUMERO}?text=${encodeURIComponent(
                      `Olá! Gostaria de confirmar minhas cotas na Ação Solidária. Meu documento/nome é: ${documentoOuId}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Falar no WhatsApp com o Suporte</span>
                  </a>
                </div>
              </div>
            ) : (
              pedidosEncontrados.map((ped) => {
                const isPago = ped.status_pagamento === 'pago';

                // Localiza números das cotas associadas
                const cotasDoPedido = cotas.filter((c) => c.pedido_id === ped.id);
                const numeros = cotasDoPedido.map((c) => c.numero).length > 0
                  ? cotasDoPedido.map((c) => c.numero)
                  : ped.cotas_numeros || [];

                return (
                  <div
                    key={ped.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-base block">{ped.nome_comprador}</span>
                        <span className="text-[11px] text-slate-400">
                          WhatsApp: {mascararWhatsApp(ped.whatsapp)}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          isPago
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                            : 'bg-amber-950 text-amber-300 border border-amber-600/50'
                        }`}
                      >
                        {isPago ? '100% Confirmado' : ped.status_pagamento}
                      </span>
                    </div>

                    {!isPago && ped.status_pagamento === 'pendente' && (() => {
                      const tempoDecorrido = Date.now() - new Date(ped.created_at).getTime();
                      const restanteMs = Math.max(0, TEMPO_EXPIRACAO_RESERVA_MS - tempoDecorrido);
                      const restMinutos = Math.floor(restanteMs / 60000);
                      const restHoras = Math.floor(restMinutos / 60);
                      const minFinais = restMinutos % 60;

                      if (restanteMs <= 0) {
                        return (
                          <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Prazo de 3h expirado. Cotas devolvidas à grade livre.</span>
                          </div>
                        );
                      }

                      return (
                        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs flex items-center justify-between">
                          <span className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                            <span>Tempo restante da reserva (3h):</span>
                          </span>
                          <span className="font-bold font-mono">
                            {restHoras > 0 ? `${restHoras}h ${minFinais}m` : `${minFinais}m`}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="text-xs text-slate-400 flex items-center justify-between border-t border-b border-slate-900 py-2">
                      <span>Valor: <strong className="text-white">{formatarMoeda(ped.valor_total)}</strong></span>
                      <span>Total: <strong className="text-white">{ped.quantidade_cotas} {ped.quantidade_cotas === 1 ? 'cota' : 'cotas'}</strong></span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-amber-300 font-bold">
                          Seus Números no Sorteio:
                        </span>
                        {numeros.length > 0 && (
                          <button
                            type="button"
                            onClick={() => copiarNumerosCotas(ped.id, numeros)}
                            className="text-[11px] text-slate-300 hover:text-white flex items-center space-x-1 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                          >
                            {copiouPedidoId === ped.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar Números</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800">
                        {numeros.map((n) => (
                          <span
                            key={n}
                            className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
                              isPago
                                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {formatarNumeroCota(n)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

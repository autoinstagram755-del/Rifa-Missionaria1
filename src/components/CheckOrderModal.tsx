import React, { useState } from 'react';
import { X, Search, CheckCircle, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Pedido, Cota } from '../lib/supabase.ts';
import { formatarMoeda, formatarNumeroCota, mascararCPF, mascararWhatsApp, TEMPO_EXPIRACAO_RESERVA_MS } from '../utils/rules.ts';

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

  if (!isOpen) return null;

  const termoLimpo = documentoOuId.replace(/\D/g, '');

  const pedidosEncontrados = pedidos.filter((p) => {
    if (!termoLimpo && !documentoOuId.trim()) return false;
    const cpfPedidoLimpo = p.cpf.replace(/\D/g, '');
    const whatsPedidoLimpo = p.whatsapp.replace(/\D/g, '');
    return (
      (termoLimpo && (cpfPedidoLimpo.includes(termoLimpo) || whatsPedidoLimpo.includes(termoLimpo))) ||
      p.id.toLowerCase().includes(documentoOuId.trim().toLowerCase())
    );
  });

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setConsultado(true);
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
            Digite seu CPF ou WhatsApp para ver seus números e o status do pagamento.
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
            placeholder="Digite seu CPF ou WhatsApp..."
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
          <div className="mt-6 space-y-4">
            {pedidosEncontrados.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p>Nenhuma cota encontrada para este documento.</p>
                <p className="mt-1">Verifique se digitou o CPF ou telefone exatamente como no cadastro.</p>
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
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{ped.nome_comprador}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          isPago
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                            : 'bg-amber-950 text-amber-300 border border-amber-600/50'
                        }`}
                      >
                        {ped.status_pagamento}
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
                          <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Prazo de 3h expirado. Cotas liberadas na grade.</span>
                          </div>
                        );
                      }

                      return (
                        <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs flex items-center justify-between">
                          <span className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                            <span>Tempo de reserva (3h):</span>
                          </span>
                          <span className="font-bold font-mono">
                            {restHoras > 0 ? `${restHoras}h ${minFinais}m restantes` : `${minFinais}m restantes`}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>Valor: {formatarMoeda(ped.valor_total)}</span>
                      <span>Total: {ped.quantidade_cotas} cotas</span>
                    </div>

                    <div>
                      <span className="text-xs text-amber-300 font-bold block mb-1">
                        Seus Números no Sorteio:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {numeros.map((n) => (
                          <span
                            key={n}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs font-bold"
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

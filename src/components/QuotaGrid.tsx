import React, { useState, useMemo } from 'react';
import {
  Search,
  Dices,
  CheckCircle,
  Clock,
  Ban,
  ArrowRight,
  Filter,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Cota } from '../lib/supabase.ts';
import { formatarNumeroCota, calcularValorTotal, formatarMoeda } from '../utils/rules.ts';

interface QuotaGridProps {
  cotas: Cota[];
  cotasSelecionadas: number[];
  onToggleCota: (numero: number) => void;
  onSelecionarAleatorio: (quantidade: number) => void;
  onLimparSelecao: () => void;
  onFinalizarSelecao: () => void;
}

export const QuotaGrid: React.FC<QuotaGridProps> = ({
  cotas,
  cotasSelecionadas,
  onToggleCota,
  onSelecionarAleatorio,
  onLimparSelecao,
  onFinalizarSelecao,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'disponivel' | 'reservado' | 'pago' | 'selecionadas'>('todas');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 100;

  // Filtragem eficiente
  const cotasFiltradas = useMemo(() => {
    return cotas.filter((cota) => {
      // Filtro de busca
      if (busca.trim()) {
        const numFormatado = formatarNumeroCota(cota.numero);
        if (!numFormatado.includes(busca.trim()) && !String(cota.numero).includes(busca.trim())) {
          return false;
        }
      }

      // Filtro de status
      if (filtroStatus === 'selecionadas') {
        return cotasSelecionadas.includes(cota.numero);
      }
      if (filtroStatus !== 'todas') {
        return cota.status === filtroStatus;
      }

      return true;
    });
  }, [cotas, busca, filtroStatus, cotasSelecionadas]);

  // Paginação
  const totalPaginas = Math.ceil(cotasFiltradas.length / itensPorPagina) || 1;
  const cotasExibidas = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return cotasFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [cotasFiltradas, pagina, itensPorPagina]);

  const valorTotalSelecionado = calcularValorTotal(cotasSelecionadas.length);

  return (
    <section id="grade-cotas" className="py-16 sm:py-20 bg-slate-900 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Grade */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>ESCOLHA INTERATIVA</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Mapa de Cotas: <span className="text-amber-400">001 a 500</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base">
            Selecione seus números preferidos na grade ou use a ferramenta de{' '}
            <strong className="text-amber-300">Seleção Aleatória</strong> para sortear números
            disponíveis.
          </p>
        </div>

        {/* Barra de Ações: Surpresinha & Busca */}
        <div className="mt-10 p-5 rounded-2xl bg-slate-800/90 border border-slate-700 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Botões de Seleção Aleatória (Surpresinha) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1 mr-1">
                <Dices className="w-4 h-4" />
                <span>Surpresinha:</span>
              </span>
              <button
                type="button"
                onClick={() => onSelecionarAleatorio(1)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition cursor-pointer"
              >
                +1 Cota
              </button>
              <button
                type="button"
                onClick={() => onSelecionarAleatorio(3)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-700 transition cursor-pointer"
              >
                +3 (Combo Missão)
              </button>
              <button
                type="button"
                onClick={() => onSelecionarAleatorio(7)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 transition cursor-pointer"
              >
                +7 (Liderança)
              </button>
              <button
                type="button"
                onClick={() => onSelecionarAleatorio(15)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-700 transition cursor-pointer"
              >
                +15 (Patrocinador)
              </button>

              {cotasSelecionadas.length > 0 && (
                <button
                  type="button"
                  onClick={onLimparSelecao}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-300 hover:bg-rose-950/60 border border-rose-800/60 transition cursor-pointer"
                >
                  Limpar Seleção
                </button>
              )}
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar número (ex: 042)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Legenda & Filtros de Status */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-700/60 gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="text-slate-400 font-medium">Legenda:</span>
              <span className="flex items-center space-x-1.5 text-slate-300">
                <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-600 inline-block" />
                <span>Disponível</span>
              </span>
              <span className="flex items-center space-x-1.5 text-amber-400">
                <span className="w-3.5 h-3.5 rounded bg-amber-400 text-slate-950 inline-block" />
                <span>Selecionado ({cotasSelecionadas.length})</span>
              </span>
              <span className="flex items-center space-x-1.5 text-amber-300/80">
                <span className="w-3.5 h-3.5 rounded bg-amber-950 border border-amber-600/60 inline-block" />
                <span>Reservado</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-500">
                <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-800 inline-block" />
                <span>Pago</span>
              </span>
            </div>

            {/* Abas de Filtro */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setFiltroStatus('todas');
                  setPagina(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  filtroStatus === 'todas' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltroStatus('disponivel');
                  setPagina(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  filtroStatus === 'disponivel' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Disponíveis
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltroStatus('reservado');
                  setPagina(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  filtroStatus === 'reservado' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Reservadas
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltroStatus('pago');
                  setPagina(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  filtroStatus === 'pago' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pagas
              </button>
              {cotasSelecionadas.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroStatus('selecionadas');
                    setPagina(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    filtroStatus === 'selecionadas' ? 'bg-amber-400 text-slate-950' : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  Minhas ({cotasSelecionadas.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grade de Botões (1 a 500) */}
        <div className="mt-8">
          {cotasExibidas.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-slate-700/60 p-8">
              <Search className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-200">Nenhuma cota encontrada</h4>
              <p className="text-xs text-slate-400 mt-1">
                Tente ajustar sua busca ou limpar os filtros de status.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-2">
              {cotasExibidas.map((cota) => {
                const isSelected = cotasSelecionadas.includes(cota.numero);
                const isPago = cota.status === 'pago';
                const isReservado = cota.status === 'reservado';
                const isDisponivel = cota.status === 'disponivel';

                let classeBotao =
                  'bg-slate-800/90 text-slate-200 border-slate-700/80 hover:bg-slate-700 hover:border-amber-400';

                if (isSelected) {
                  classeBotao =
                    'bg-amber-400 text-slate-950 font-extrabold border-amber-300 shadow-md shadow-amber-400/40 ring-2 ring-amber-400';
                } else if (isPago) {
                  classeBotao =
                    'bg-slate-950/80 text-slate-600 border-slate-900 cursor-not-allowed opacity-60 line-through';
                } else if (isReservado) {
                  classeBotao =
                    'bg-amber-950/50 text-amber-300/80 border-amber-700/50 cursor-not-allowed opacity-80';
                }

                return (
                  <button
                    key={cota.numero}
                    type="button"
                    disabled={isPago || (isReservado && !isSelected)}
                    onClick={() => isDisponivel && onToggleCota(cota.numero)}
                    title={
                      isSelected
                        ? `Cota ${formatarNumeroCota(cota.numero)} (Selecionada por você)`
                        : isPago
                        ? `Cota ${formatarNumeroCota(cota.numero)} (Já Paga)`
                        : isReservado
                        ? `Cota ${formatarNumeroCota(cota.numero)} (Reservada - aguardando Pix)`
                        : `Cota ${formatarNumeroCota(cota.numero)} (Disponível - clique para escolher)`
                    }
                    className={`h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-mono font-bold flex flex-col items-center justify-center border transition-all duration-150 cursor-pointer ${classeBotao}`}
                  >
                    <span>{formatarNumeroCota(cota.numero)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Paginação se houver mais páginas */}
          {totalPaginas > 1 && (
            <div className="mt-8 flex items-center justify-center space-x-2">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setPagina(pg)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition cursor-pointer ${
                    pagina === pg
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {pg}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Barra Flutuante de Confirmação quando houver cotas selecionadas */}
        {cotasSelecionadas.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-2 border-amber-400/80 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shrink-0">
                  {cotasSelecionadas.length}
                </div>
                <div>
                  <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider block">
                    Cotas Selecionadas
                  </span>
                  <div className="text-sm font-mono text-slate-200 max-w-xs truncate">
                    {cotasSelecionadas.map((n) => formatarNumeroCota(n)).join(', ')}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Total a Pagar</span>
                  <span className="text-xl font-extrabold text-amber-400">
                    {formatarMoeda(valorTotalSelecionado)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onFinalizarSelecao}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center space-x-2 cursor-pointer"
                >
                  <span>Avançar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Dices,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Sparkles,
  X,
  Layers,
  Check,
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

type FaixaCentena = 'todas' | '1-100' | '101-200' | '201-300' | '301-400' | '401-500';

interface FaixaInfo {
  id: FaixaCentena;
  label: string;
  min: number;
  max: number;
}

const FAIXAS: FaixaInfo[] = [
  { id: 'todas', label: 'Todas as 500', min: 1, max: 500 },
  { id: '1-100', label: '001 a 100', min: 1, max: 100 },
  { id: '101-200', label: '101 a 200', min: 101, max: 200 },
  { id: '201-300', label: '201 a 300', min: 201, max: 300 },
  { id: '301-400', label: '301 a 400', min: 301, max: 400 },
  { id: '401-500', label: '401 a 500', min: 401, max: 500 },
];

export const QuotaGrid: React.FC<QuotaGridProps> = ({
  cotas,
  cotasSelecionadas,
  onToggleCota,
  onSelecionarAleatorio,
  onLimparSelecao,
  onFinalizarSelecao,
}) => {
  const [busca, setBusca] = useState('');
  const [faixaAtiva, setFaixaAtiva] = useState<FaixaCentena>('todas');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'disponivel' | 'reservado' | 'pago' | 'selecionadas'>('todas');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 100;

  // Se o usuário digitar um número específico, sincroniza a visualização para que ele veja a cota imediatamente
  useEffect(() => {
    if (busca.trim()) {
      const numBusca = parseInt(busca.replace(/\D/g, ''), 10);
      if (!isNaN(numBusca) && numBusca >= 1 && numBusca <= 500) {
        // Se a busca estiver fora da faixa atual, coloca na faixa correspondente ou em 'todas'
        const faixa = FAIXAS.find((f) => f.id !== 'todas' && numBusca >= f.min && numBusca <= f.max);
        if (faixa && faixaAtiva !== 'todas' && faixaAtiva !== faixa.id) {
          setFaixaAtiva(faixa.id);
        }
      }
      setPagina(1);
    }
  }, [busca]);

  // Contagem dinâmica de cotas livres por faixa
  const contagemPorFaixa = useMemo(() => {
    const counts: Record<FaixaCentena, { total: number; disponivel: number; reservado: number; pago: number }> = {
      todas: { total: cotas.length, disponivel: 0, reservado: 0, pago: 0 },
      '1-100': { total: 0, disponivel: 0, reservado: 0, pago: 0 },
      '101-200': { total: 0, disponivel: 0, reservado: 0, pago: 0 },
      '201-300': { total: 0, disponivel: 0, reservado: 0, pago: 0 },
      '301-400': { total: 0, disponivel: 0, reservado: 0, pago: 0 },
      '401-500': { total: 0, disponivel: 0, reservado: 0, pago: 0 },
    };

    cotas.forEach((c) => {
      // Geral
      if (c.status === 'disponivel') counts.todas.disponivel++;
      else if (c.status === 'reservado') counts.todas.reservado++;
      else if (c.status === 'pago') counts.todas.pago++;

      // Faixas de 100
      let fKey: FaixaCentena | null = null;
      if (c.numero >= 1 && c.numero <= 100) fKey = '1-100';
      else if (c.numero >= 101 && c.numero <= 200) fKey = '101-200';
      else if (c.numero >= 201 && c.numero <= 300) fKey = '201-300';
      else if (c.numero >= 301 && c.numero <= 400) fKey = '301-400';
      else if (c.numero >= 401 && c.numero <= 500) fKey = '401-500';

      if (fKey) {
        counts[fKey].total++;
        if (c.status === 'disponivel') counts[fKey].disponivel++;
        else if (c.status === 'reservado') counts[fKey].reservado++;
        else if (c.status === 'pago') counts[fKey].pago++;
      }
    });

    return counts;
  }, [cotas]);

  // Filtragem composta eficiente (Busca + Faixa + Status)
  const cotasFiltradas = useMemo(() => {
    return cotas.filter((cota) => {
      // 1. Filtro de Faixa de Centena
      if (faixaAtiva !== 'todas') {
        const info = FAIXAS.find((f) => f.id === faixaAtiva);
        if (info && (cota.numero < info.min || cota.numero > info.max)) {
          return false;
        }
      }

      // 2. Filtro de Busca textual/numérica
      if (busca.trim()) {
        const termo = busca.trim();
        const numFormatado = formatarNumeroCota(cota.numero);
        const numeroStr = String(cota.numero);
        if (!numFormatado.includes(termo) && !numeroStr.includes(termo)) {
          return false;
        }
      }

      // 3. Filtro de Status
      if (filtroStatus === 'selecionadas') {
        return cotasSelecionadas.includes(cota.numero);
      }
      if (filtroStatus !== 'todas') {
        return cota.status === filtroStatus;
      }

      return true;
    });
  }, [cotas, faixaAtiva, busca, filtroStatus, cotasSelecionadas]);

  // Se a faixa for específica de 100 cotas ou busca ativa, exibimos todas de uma vez sem necessidade de paginar.
  // Se for "todas as 500", permitimos visualização direta ou paginação suave de 100 em 100.
  const [exibirTodas500Direto, setExibirTodas500Direto] = useState(false);

  const cotasExibidas = useMemo(() => {
    if (faixaAtiva !== 'todas' || exibirTodas500Direto || busca.trim().length > 0 || filtroStatus === 'selecionadas') {
      return cotasFiltradas;
    }
    const inicio = (pagina - 1) * itensPorPagina;
    return cotasFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [cotasFiltradas, faixaAtiva, exibirTodas500Direto, busca, filtroStatus, pagina, itensPorPagina]);

  const totalPaginas = Math.ceil(cotasFiltradas.length / itensPorPagina) || 1;
  const valorTotalSelecionado = calcularValorTotal(cotasSelecionadas.length);

  return (
    <section id="grade-cotas" className="py-16 sm:py-20 bg-slate-900 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Grade */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>ESCOLHA INTERATIVA EM TEMPO REAL</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Mapa Oficial de Cotas: <span className="text-amber-400">001 a 500</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base">
            Selecione seus números da sorte abaixo. Navegue por bloco de centena ou busque seu número preferido com verificação em tempo real.
          </p>
        </div>

        {/* Barra de Ações: Surpresinha & Busca Rápida */}
        <div className="mt-8 p-5 rounded-3xl bg-slate-800/90 border border-slate-700 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Botões de Seleção Rápida (Surpresinha) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1 mr-1">
                <Dices className="w-4 h-4" />
                <span>Surpresinha:</span>
              </span>
              <button
                type="button"
                onClick={() => onSelecionarAleatorio(1)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition cursor-pointer active:scale-95"
              >
                +1 Cota
              </button>
              <button
                type="button"
                onClick={() => onSelecionarAleatorio(3)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-700 transition cursor-pointer active:scale-95"
              >
                +3 (Combo Missão)
              </button>
              <button
                type="button"
                onClick={() => onSelecionarAleatorio(7)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 transition cursor-pointer active:scale-95"
              >
                +7 (Liderança)
              </button>
              <button
                type="button"
                onClick={() => onSelecionarAleatorio(15)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-700 transition cursor-pointer active:scale-95"
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

            {/* Campo de Busca Rápida com Limpeza Instantânea */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar cota (ex: 206, 042)..."
                className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Abas de Navegação por Faixa de Centena (001-100, 101-200, 201-300, etc.) */}
          <div className="pt-3 border-t border-slate-700/60 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Navegar por Centenas:</span>
              </span>

              {faixaAtiva === 'todas' && !busca && (
                <button
                  type="button"
                  onClick={() => setExibirTodas500Direto(!exibirTodas500Direto)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium self-start sm:self-auto cursor-pointer"
                >
                  {exibirTodas500Direto ? 'Visualizar com Paginação (100 por vez)' : 'Exibir todas as 500 cotas de uma vez'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {FAIXAS.map((faixa) => {
                const count = contagemPorFaixa[faixa.id];
                const isActive = faixaAtiva === faixa.id;

                return (
                  <button
                    key={faixa.id}
                    type="button"
                    onClick={() => {
                      setFaixaAtiva(faixa.id);
                      setPagina(1);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-md'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-xs font-bold block">{faixa.label}</span>
                    <span
                      className={`text-[10px] mt-1 font-mono ${
                        isActive ? 'text-slate-900 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {count.disponivel} livres · {count.pago + count.reservado} ocupadas
                    </span>
                  </button>
                );
              })}
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
              <span className="flex items-center space-x-1.5 text-amber-400 font-semibold">
                <span className="w-3.5 h-3.5 rounded bg-amber-400 text-slate-950 inline-block" />
                <span>Selecionado ({cotasSelecionadas.length})</span>
              </span>
              <span className="flex items-center space-x-1.5 text-amber-300/80">
                <span className="w-3.5 h-3.5 rounded bg-amber-950 border border-amber-600/60 inline-block" />
                <span>Reservado</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-3.5 h-3.5 rounded bg-slate-950 border border-slate-800 inline-block" />
                <span>Pago &amp; Confirmado</span>
              </span>
            </div>

            {/* Abas de Filtro de Status */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setFiltroStatus('todas');
                  setPagina(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  filtroStatus === 'todas' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
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
                  filtroStatus === 'disponivel' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Livres ({contagemPorFaixa[faixaAtiva].disponivel})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltroStatus('reservado');
                  setPagina(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  filtroStatus === 'reservado' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Reservadas ({contagemPorFaixa[faixaAtiva].reservado})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltroStatus('pago');
                  setPagina(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  filtroStatus === 'pago' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pagas ({contagemPorFaixa[faixaAtiva].pago})
              </button>
              {cotasSelecionadas.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroStatus('selecionadas');
                    setPagina(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    filtroStatus === 'selecionadas' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-amber-400 hover:text-amber-300'
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
            <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-700/60 p-8">
              <Search className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-200">Nenhuma cota encontrada</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Não encontramos cotas com os filtros selecionados. Tente trocar de centena ou limpar o termo de busca.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setFaixaAtiva('todas');
                  setFiltroStatus('todas');
                }}
                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Resetar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-2">
              {cotasExibidas.map((cota) => {
                const isSelected = cotasSelecionadas.includes(cota.numero);
                const isPago = cota.status === 'pago';
                const isReservado = cota.status === 'reservado';
                const isDisponivel = cota.status === 'disponivel';

                let classeBotao =
                  'bg-slate-800/90 text-slate-200 border-slate-700/80 hover:bg-slate-700 hover:border-amber-400 hover:text-white';

                if (isSelected) {
                  classeBotao =
                    'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-lg shadow-amber-400/40 ring-2 ring-amber-400 scale-[1.03] z-10';
                } else if (isPago) {
                  classeBotao =
                    'bg-slate-950 text-slate-500 border-slate-900 cursor-not-allowed opacity-75';
                } else if (isReservado) {
                  classeBotao =
                    'bg-amber-950/60 text-amber-300/80 border-amber-700/50 cursor-not-allowed opacity-85';
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
                        ? `Cota ${formatarNumeroCota(cota.numero)} (Já Paga e Confirmada)`
                        : isReservado
                        ? `Cota ${formatarNumeroCota(cota.numero)} (Reservada - aguardando confirmação)`
                        : `Cota ${formatarNumeroCota(cota.numero)} (Disponível - clique para escolher)`
                    }
                    className={`h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-mono font-bold flex flex-col items-center justify-center border transition-all duration-150 cursor-pointer active:scale-95 ${classeBotao}`}
                  >
                    <span>{formatarNumeroCota(cota.numero)}</span>
                    {isPago && (
                      <span className="text-[9px] uppercase tracking-tighter opacity-80 font-sans">
                        Paga
                      </span>
                    )}
                    {isReservado && !isSelected && (
                      <span className="text-[9px] uppercase tracking-tighter text-amber-400/90 font-sans">
                        Reserva
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Paginação suave se a opção de 500 cotas com paginação estiver ativa */}
          {faixaAtiva === 'todas' && !exibirTodas500Direto && !busca && totalPaginas > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <span className="text-xs text-slate-400">Páginas de cotas:</span>
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pg) => {
                  const inicio = (pg - 1) * 100 + 1;
                  const fim = Math.min(pg * 100, 500);
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setPagina(pg)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        pagina === pg
                          ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {String(inicio).padStart(3, '0')}-{String(fim).padStart(3, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Barra Flutuante de Confirmação quando houver cotas selecionadas */}
        {cotasSelecionadas.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-2 border-amber-400/80 rounded-3xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                  {cotasSelecionadas.length}
                </div>
                <div>
                  <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider block">
                    Cotas Selecionadas
                  </span>
                  <div className="text-sm font-mono text-slate-200 max-w-xs truncate font-bold">
                    {cotasSelecionadas.map((n) => formatarNumeroCota(n)).join(', ')}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Total a Contribuir</span>
                  <span className="text-xl font-extrabold text-amber-400 tabular-nums">
                    {formatarMoeda(valorTotalSelecionado)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onFinalizarSelecao}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-2xl transition shadow-lg shadow-amber-400/20 flex items-center space-x-2 cursor-pointer active:scale-95"
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

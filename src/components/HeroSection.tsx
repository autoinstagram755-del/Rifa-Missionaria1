import React, { useState } from 'react';
import {
  Sparkles,
  Watch,
  ArrowRight,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Camera,
  Maximize2,
  X,
} from 'lucide-react';
import { EstatisticasCotas, formatarMoeda, META_VALOR_TOTAL } from '../utils/rules.ts';

export const FOTOS_RELOGIO = [
  {
    id: 1,
    url: '/images/relogio/relogio-1.webp',
    fallbackUrl: 'https://iili.io/nOaukrb.md.webp',
    titulo: 'Relógio Especial de Precisão',
    subtitulo: 'Inspiração: Omega Speedmaster Moonwatch "Silver Snoopy Award"',
    descricao:
      'Generosamente doado pelo Pr. Jorge Silva (@guilherme_gui_trader - Rocha Church Águas Lindas). Modelo de alta precisão inspirado no lendário Omega Speedmaster Moonwatch "Silver Snoopy Award" (homenagem/inspiração ao modelo original).',
  },
  {
    id: 2,
    url: '/images/relogio/relogio-2.webp',
    fallbackUrl: 'https://iili.io/nOaueEu.md.webp',
    titulo: 'Detalhes da Caixa & Pulseira',
    subtitulo: 'Acabamento Robusto em Aço & Mostrador Cronógrafo',
    descricao:
      'Estrutura em aço inoxidável e botões cronógrafo. Uma bela peça inspirada no clássico Moonwatch Snoopy para abençoar a arrecadação da missão.',
  },
  {
    id: 3,
    url: '/images/relogio/relogio-3.webp',
    fallbackUrl: 'https://iili.io/nOau82j.md.webp',
    titulo: 'Peça no Estojo & Mostrador Detalhado',
    subtitulo: 'Pronta para Entrega ao Vencedor da Ação',
    descricao:
      'Relógio novo e revisado. Concorra com cada cota adquirida e ajude a honrar o conserto do carro emprestado.',
  },
];

interface HeroSectionProps {
  stats: EstatisticasCotas;
  onSelectCombo: () => void;
  onOpenStory: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  stats,
  onSelectCombo,
  onOpenStory,
}) => {
  const [activeFotoIndex, setActiveFotoIndex] = useState(0);
  const [modalFotoAberta, setModalFotoAberta] = useState(false);

  const fotoAtual = FOTOS_RELOGIO[activeFotoIndex];

  const nextFoto = () => {
    setActiveFotoIndex((prev) => (prev + 1) % FOTOS_RELOGIO.length);
  };

  const prevFoto = () => {
    setActiveFotoIndex((prev) => (prev - 1 + FOTOS_RELOGIO.length) % FOTOS_RELOGIO.length);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white pt-8 pb-16 lg:pt-12 lg:pb-20">
      {/* Luzes de fundo decorativas */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho do Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AÇÃO ENTRE AMIGOS • TRANSPORTE MISSIONÁRIO</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Ação Solidária:{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              Missão &amp; Cooperação
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Unidos para cobrir os custos do transporte missionário. Concorra a um{' '}
            <strong className="text-amber-300 font-semibold">Relógio Especial</strong> e semeie
            nesta causa de fé e cooperação mútua!
          </p>
        </div>

        {/* Grid Principal: Card do Relógio com Fotos Reais + Card de Progresso */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Coluna do Prêmio: Relógio com Galeria de Fotos Reais (7 colunas) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="relative flex-1 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 p-6 sm:p-7 flex flex-col justify-between shadow-2xl overflow-hidden group">
              {/* Topo do Card com Badge e Controles 1 / 3 */}
              <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold border bg-amber-500/10 text-amber-300 border-amber-500/30">
                  <Watch className="w-3.5 h-3.5 text-amber-400" />
                  <span>Prêmio Especial da Ação</span>
                </div>

                {/* Controles de Foto: 1 / 3 */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevFoto}
                    aria-label="Foto anterior do relógio"
                    className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-amber-300 px-1">
                    {activeFotoIndex + 1} / {FOTOS_RELOGIO.length}
                  </span>
                  <button
                    onClick={nextFoto}
                    aria-label="Próxima foto do relógio"
                    className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Corpo Principal: Foto Real + Descrição */}
              <div className="relative z-10 my-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                {/* Visualizador da Foto Real */}
                <div className="sm:col-span-5 relative group/img cursor-pointer" onClick={() => setModalFotoAberta(true)}>
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500/40 shadow-xl shadow-amber-500/10 flex items-center justify-center">
                    <img
                      src={fotoAtual.url}
                      alt={fotoAtual.titulo}
                      onError={(e) => {
                        // Fallback automático para o host remoto se o arquivo local demorar
                        const target = e.currentTarget;
                        if (target.src !== fotoAtual.fallbackUrl) {
                          target.src = fotoAtual.fallbackUrl;
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                    />

                    {/* Badge flutuante de Foto Real */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[10px] font-semibold text-amber-300 flex items-center space-x-1">
                      <Camera className="w-3 h-3 text-amber-400" />
                      <span>Foto Real</span>
                    </div>

                    {/* Botão de Ampliar */}
                    <div className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-white hover:bg-amber-400 hover:text-slate-950 transition opacity-80 group-hover/img:opacity-100">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Miniaturas das 3 Fotos Reais */}
                  <div className="flex items-center justify-center space-x-2 mt-3">
                    {FOTOS_RELOGIO.map((foto, idx) => (
                      <button
                        key={foto.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFotoIndex(idx);
                        }}
                        className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          activeFotoIndex === idx
                            ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105'
                            : 'border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={foto.url}
                          alt={`Miniatura ${foto.id}`}
                          onError={(e) => {
                            e.currentTarget.src = foto.fallbackUrl;
                          }}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Texto Explicativo e Testemunho do Relógio */}
                <div className="sm:col-span-7 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                      {fotoAtual.subtitulo}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                      Relógio Especial de Precisão
                    </h3>
                  </div>

                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    Generosamente doado pelo{' '}
                    <strong className="text-amber-300 font-semibold">Pr. Jorge Silva</strong> (
                    <a
                      href="https://instagram.com/guilherme_gui_trader"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline font-medium"
                    >
                      @guilherme_gui_trader
                    </a>{' '}
                    — Rocha Church Águas Lindas). Peça com mostrador cronógrafo azul e branco de alta precisão.
                  </p>

                  {/* Aviso de Transparência sobre a Inspiração no Modelo */}
                  <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/30 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Nota de Transparência</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      O modelo da foto é uma <strong className="text-white">inspiração / homenagem de alta precisão</strong> baseada no icônico design do <strong>Omega Speedmaster Moonwatch &quot;Silver Snoopy Award&quot;</strong>.
                    </p>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-300 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/30">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Concorra com cada cota</span>
                    </div>

                    <button
                      onClick={() => setModalFotoAberta(true)}
                      className="text-xs text-slate-400 hover:text-amber-300 flex items-center space-x-1 px-2 py-1 transition cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Ver foto ampliada</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Rodapé do Card com Navegação e Link da História */}
              <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  {FOTOS_RELOGIO.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveFotoIndex(idx)}
                      aria-label={`Ver foto ${idx + 1}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeFotoIndex === idx
                          ? 'w-8 bg-amber-400'
                          : 'w-2 bg-slate-700 hover:bg-slate-600'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={onOpenStory}
                  className="text-xs font-semibold text-slate-300 hover:text-white flex items-center space-x-1 transition cursor-pointer"
                >
                  <span>Conhecer testemunho completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Coluna do Progresso & Chamada para Ação (5 colunas) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 rounded-3xl bg-slate-800/90 border border-slate-700 p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Progresso da Campanha
                  </span>
                  <span className="text-xs font-medium text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Atualizado em tempo real</span>
                  </span>
                </div>

                {/* Percentual em destaque */}
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-4xl sm:text-5xl font-extrabold text-white">
                      {stats.percentualPago}%
                    </span>
                    <span className="text-sm text-slate-400 ml-2 font-medium">alcançado</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Cotas Restantes</span>
                    <span className="text-xl sm:text-2xl font-bold text-amber-400">
                      {stats.disponiveis}{' '}
                      <span className="text-xs text-slate-400 font-normal">/ {stats.total}</span>
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="mt-4">
                  <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-1000 shadow-sm shadow-amber-400/50"
                      style={{ width: `${Math.max(4, Math.min(100, stats.percentualPago))}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>{stats.pagas} cotas confirmadas</span>
                    <span>{stats.reservadas} reservadas (aguardando Pix)</span>
                  </div>
                </div>

                {/* Mini Cards de Estatísticas */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Total de Cotas
                    </span>
                    <span className="text-lg font-bold text-white">500 cotas</span>
                    <span className="text-[10px] text-slate-400 block">R$ 20 / cota</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Compromisso de Honra
                    </span>
                    <span className="text-sm sm:text-base font-bold text-amber-300 block truncate">
                      Conserto do Veículo
                    </span>
                    <span className="text-[10px] text-slate-400 block">Carro Emprestado</span>
                  </div>
                </div>
              </div>

              {/* Botão de Compra Imediata */}
              <div className="mt-8 space-y-3">
                <button
                  onClick={onSelectCombo}
                  className="w-full py-4 px-6 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-base sm:text-lg"
                >
                  <span>Participar da Ação Solidária</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="flex items-center justify-center space-x-4 text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pix Copia e Cola</span>
                  </span>
                  <span>•</span>
                  <span>Confirmação Imediata</span>
                  <span>•</span>
                  <span>Sorteio Transparente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Lightbox de Foto Ampliada do Relógio */}
      {modalFotoAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          onClick={() => setModalFotoAberta(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Foto Real do Prêmio ({activeFotoIndex + 1} de {FOTOS_RELOGIO.length})
                </span>
                <h4 className="text-lg font-bold text-white">{fotoAtual.titulo}</h4>
                <p className="text-[11px] text-slate-400">
                  Modelo inspiração baseado no icônico <em>Omega Speedmaster Moonwatch &quot;Silver Snoopy Award&quot;</em>
                </p>
              </div>
              <button
                onClick={() => setModalFotoAberta(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-square max-h-[60vh] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <img
                src={fotoAtual.url}
                alt={fotoAtual.titulo}
                onError={(e) => {
                  e.currentTarget.src = fotoAtual.fallbackUrl;
                }}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                {FOTOS_RELOGIO.map((foto, idx) => (
                  <button
                    key={foto.id}
                    onClick={() => setActiveFotoIndex(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      activeFotoIndex === idx
                        ? 'border-amber-400 ring-2 ring-amber-400/40'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={foto.url}
                      alt={`Miniatura ${foto.id}`}
                      onError={(e) => {
                        e.currentTarget.src = foto.fallbackUrl;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={prevFoto}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextFoto}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

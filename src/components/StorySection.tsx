import React from 'react';
import {
  MapPin,
  AlertTriangle,
  Gift,
  Car,
  HeartHandshake,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { JourneyGallery } from './JourneyGallery.tsx';

interface StorySectionProps {
  onGoToCombos: () => void;
}

export const StorySection: React.FC<StorySectionProps> = ({ onGoToCombos }) => {
  const etapas = [
    {
      icon: MapPin,
      titulo: '1. A Partida em Missão',
      local: 'Águas Lindas de Goiás (GO)',
      texto: (
        <>
          O casal de pastores —{' '}
          <strong className="text-white font-bold">Pastor Jocimar Araújo</strong> (
          <a
            href="https://instagram.com/pr.jocimararaujo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline font-medium"
          >
            @pr.jocimararaujo
          </a>
          ) e <strong className="text-white font-bold">Pastora Ana Cristina</strong> (
          <a
            href="https://instagram.com/anacristinaricardo9"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline font-medium"
          >
            @anacristinaricardo9
          </a>
          ) — iniciou a jornada de <strong className="text-amber-300">1.130 km só de ida</strong> rumo a Bertioga/SP para o evento anual Vision Day. O propósito da viagem era receber orientações e alinhamentos espirituais, reconhecimento pastoral e ter momentos preciosos de comunhão com a nossa Igreja-Mãe.
        </>
      ),
      cor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: AlertTriangle,
      titulo: '2. Veículo Emprestado & Quebra',
      local: 'Trecho próximo a Uberaba (MG)',
      texto:
        'O carro utilizado na viagem foi generosamente emprestado por um irmão. Infelizmente, no meio da estrada em Uberaba/MG, o veículo sofreu uma quebra mecânica inesperada.',
      cor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      icon: Car,
      titulo: '3. A Decisão pela Missão',
      local: 'Mobilização Imediata',
      texto:
        'Para não frustrar este momento tão importante de alinhamento e comunhão no Vision Day com a nossa Igreja-Mãe, acionamos um guincho para levar o carro emprestado até uma oficina mecânica em Uberaba mesmo, e locamos outro carro para prosseguir viagem até o litoral paulista.',
      cor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      icon: Gift,
      titulo: '4. A Dádiva do Relógio Especial',
      local: 'Gesto de Amor & Fraternidade',
      texto: (
        <>
          Diante da soma dos custos inesperados, o{' '}
          <strong className="text-white font-bold">Pastor Jorge Silva</strong> (
          <a
            href="https://instagram.com/guilherme_gui_trader"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline font-medium"
          >
            @guilherme_gui_trader
          </a>{' '}
          — Rocha Church Águas Lindas) doou de coração este Relógio Especial de alta precisão — modelo inspirado no icônico Omega Speedmaster Moonwatch &quot;Silver Snoopy Award&quot; — para que pudéssemos organizar esta Ação Entre Amigos e honrar nosso compromisso.
        </>
      ),
      cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  const pilaresHonra = [
    {
      titulo: 'Carro Emprestado de Boa-Fé',
      descricao:
        'O proprietário do veículo nos estendeu a mão com amor fraterno, confiando seu automóvel para que a missão acontecesse.',
    },
    {
      titulo: 'Compromisso & Integridade Cristã',
      descricao:
        'Como pessoas de fé, temos o dever moral e espiritual de honrar esse compromisso: arcar com todo o conserto mecânico e devolver o veículo em perfeito estado de funcionamento.',
    },
    {
      titulo: 'Cuidar de Quem Nos Abençoou',
      descricao:
        'Quem nos socorreu com generosidade jamais pode ficar no prejuízo. Esta ação solidária é o nosso testemunho público de retidão, gratidão e cuidado mútuo.',
    },
  ];

  return (
    <section id="historia-missao" className="py-16 sm:py-24 bg-slate-900 text-slate-100 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Título da Seção */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <HeartHandshake className="w-4 h-4 text-blue-400" />
            <span>TESTEMUNHO &amp; HONRA</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Nossa Jornada: <span className="text-amber-400">Compromisso &amp; Fé</span>
          </h2>

          <p className="text-slate-300 text-base sm:text-lg">
            Conheça o que motivou esta ação solidária e por que é fundamental honrarmos quem nos
            estendeu a mão com generosidade.
          </p>
        </div>

        {/* Linha do Tempo / Etapas */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {etapas.map((etapa, idx) => {
            const Icon = etapa.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-6 flex flex-col justify-between hover:border-slate-600 transition shadow-lg group"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${etapa.cor}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-amber-400 block mb-1">
                    {etapa.local}
                  </span>
                  <h3 className="text-lg font-bold text-white mb-2">{etapa.titulo}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{etapa.texto}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Galeria Visual Completa: Diário Visual da Missão (22 fotos cronológicas) */}
        <JourneyGallery />

        {/* Card de Compromisso de Honra com o Proprietário do Carro */}
        <div className="mt-12 rounded-3xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-amber-500/30 p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-700/80 gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-amber-400/10 rounded-2xl border border-amber-400/30 text-amber-400">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Causa Principal da Ação
                </span>
                <h4 className="text-xl sm:text-2xl font-extrabold text-white">
                  Nosso Compromisso de Honra com o Dono do Carro
                </h4>
              </div>
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-600/40 text-blue-200 text-xs font-semibold self-start sm:self-auto">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Integridade Cristã</span>
            </div>
          </div>

          {/* Texto Explicativo com Ênfase no Veículo Emprestado */}
          <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            <p>
              O veículo que quebrou no meio da estrada em Uberaba/MG <strong className="text-white">foi gentilmente emprestado</strong> por
              um irmão para que a equipe realizasse o transporte missionário até o Vision Day.
            </p>
            <p>
              Diante desse imprevisto mecânico, temos a firme convicção de que devemos <strong className="text-amber-300">honrar integralmente o nosso compromisso com o proprietário do carro</strong>,
              garantindo todo o conserto necessário para devolvê-lo em perfeito estado, sem que quem nos abençoou sofra qualquer prejuízo.
            </p>
          </div>

          {/* 3 Pilares de Honra */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {pilaresHonra.map((pilar, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700/60 space-y-1.5"
              >
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs sm:text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{pilar.titulo}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{pilar.descricao}</p>
              </div>
            ))}
          </div>

          {/* Versículo de Fé & Botão Semear */}
          <div className="pt-4 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/50 p-4 rounded-2xl">
            <p className="text-xs sm:text-sm italic text-slate-300 text-center sm:text-left">
              &quot;Levai as cargas uns dos outros e, assim, cumprireis a lei de Cristo.&quot; — Gálatas 6:2
            </p>
            <button
              onClick={onGoToCombos}
              className="shrink-0 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-amber-400/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Semear Nesta Causa</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

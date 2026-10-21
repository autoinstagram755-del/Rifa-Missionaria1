import React from 'react';
import { Sparkles, Check, ArrowRight, ShieldCheck, Zap, Star } from 'lucide-react';
import { COMBOS_DISPONIVEIS, ComboItem, formatarMoeda } from '../utils/rules.ts';

interface ComboSectionProps {
  onSelectCombo: (combo: ComboItem) => void;
  onOpenManualGrid: () => void;
}

export const ComboSection: React.FC<ComboSectionProps> = ({
  onSelectCombo,
  onOpenManualGrid,
}) => {
  return (
    <section id="combos-cotas" className="py-16 sm:py-20 bg-slate-950 text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Acelerador de Bênçãos • Compra Rápida</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Escolha seu <span className="text-amber-400">Combo de Cotas</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base">
            Selecione uma das opções mais vantajosas abaixo com desconto progressivo ou monte seu
            jogo personalizado escolhendo os números da sorte.
          </p>
        </div>

        {/* Grid de Combos */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {COMBOS_DISPONIVEIS.map((combo) => {
            const isPopular = combo.popular;
            const valorPorCota = (combo.valor / combo.cotas).toFixed(2).replace('.', ',');

            return (
              <div
                key={combo.id}
                className={`relative rounded-2xl flex flex-col justify-between p-6 transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer shadow-xl ${
                  isPopular
                    ? 'bg-gradient-to-b from-blue-900/90 via-slate-800 to-slate-900 border-2 border-amber-400 ring-2 ring-amber-400/20'
                    : 'bg-slate-900/90 border border-slate-700/80 hover:border-slate-500'
                }`}
                onClick={() => onSelectCombo(combo)}
              >
                {/* Badge de Destaque Superior */}
                {combo.destaqueBadge && (
                  <div
                    className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-extrabold shadow-md uppercase tracking-wider flex items-center space-x-1 ${
                      isPopular
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950'
                        : 'bg-slate-800 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {isPopular && <Star className="w-3 h-3 fill-slate-950 text-slate-950" />}
                    <span>{combo.destaqueBadge}</span>
                  </div>
                )}

                <div>
                  {/* Título & Subtítulo */}
                  <div className="text-center pt-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      {combo.subtitulo}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                      {combo.nome}
                    </h3>
                  </div>

                  {/* Preço em Destaque */}
                  <div className="my-6 text-center py-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-baseline justify-center space-x-1">
                      <span className="text-sm font-semibold text-slate-400">R$</span>
                      <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                        {combo.valor.toFixed(0)}
                      </span>
                      <span className="text-xs text-slate-400">,00</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Apenas R$ {valorPorCota} por cota
                    </span>
                    {combo.economiaTexto && (
                      <span className="inline-block mt-2 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {combo.economiaTexto}
                      </span>
                    )}
                  </div>

                  {/* Vantagens */}
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{combo.cotas}</strong> chances no sorteio do Relógio
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Reserva instantânea via Pix</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Comprovante nominal com CPF</span>
                    </li>
                  </ul>
                </div>

                {/* Botão de Ação */}
                <div className="mt-8">
                  <button
                    type="button"
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition shadow-md cursor-pointer ${
                      isPopular
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600/60'
                    }`}
                  >
                    <span>Quero este Combo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Opção para Escolha Manual na Grade de 001 a 500 */}
        <div className="mt-12 text-center p-6 rounded-2xl bg-slate-900/60 border border-slate-800 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-base font-bold text-white">Prefere escolher seus números da sorte?</h4>
            <p className="text-xs text-slate-400">
              Acesse a grade completa de 001 a 500 e escolha cotas específicas ou use a surpresinha.
            </p>
          </div>
          <button
            onClick={onOpenManualGrid}
            className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center space-x-2"
          >
            <span>Ver Grade de Números</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

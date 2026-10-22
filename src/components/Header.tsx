import React from 'react';
import { HeartHandshake, ShieldCheck, Database, Search, LayoutDashboard } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase.ts';

interface HeaderProps {
  onOpenAdmin?: () => void;
  onOpenCheckOrder: () => void;
  onOpenStory: () => void;
  onOpenCombos: () => void;
  onOpenGrid: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCheckOrder,
  onOpenStory,
  onOpenCombos,
  onOpenGrid,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo e Nome da Ação */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950">
              <HeartHandshake className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  Ação <span className="text-amber-400">Solidária</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-900/80 text-blue-200 border border-blue-700/50">
                  Missão &amp; Fé
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Águas Lindas de Goiás ➔ Bertioga (Vision Day)
              </p>
            </div>
          </div>

          {/* Links e Navegação Desktop */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-300">
            <button
              onClick={onOpenStory}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Testemunho &amp; Causa
            </button>
            <button
              onClick={onOpenCombos}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Combos de Cotas
            </button>
            <button
              onClick={onOpenGrid}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Escolher Números (001-500)
            </button>
          </nav>

          {/* Ações Rápidas do Comprador */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Botão Consultar Meus Números */}
            <button
              onClick={onOpenCheckOrder}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
              title="Consultar cotas compradas pelo seu CPF"
            >
              <Search className="w-4 h-4 text-amber-400" />
              <span>Consultar Cota</span>
            </button>

            {/* Botão Garantir Cotas */}
            <button
              onClick={onOpenCombos}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition cursor-pointer"
              title="Ir para os Combos Promocionais de Cotas"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Participar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

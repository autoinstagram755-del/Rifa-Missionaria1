import React from 'react';
import { HeartHandshake, ShieldCheck, Heart, MapPin, Phone, HelpCircle } from 'lucide-react';

interface FooterProps {
  onOpenStory: () => void;
  onOpenCombos: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenStory,
  onOpenCombos,
}) => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Coluna 1: Sobre */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-extrabold text-base">
              <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-950">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span>Ação Solidária</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Campanha entre amigos e irmãos para custeio emergencial do transporte e conserto de
              veículo da missão ministerial (Águas Lindas de Goiás a Bertioga/SP).
            </p>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="space-y-2">
            <span className="font-bold text-white text-xs uppercase tracking-wider block">
              Navegação
            </span>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  onClick={onOpenStory}
                  className="hover:text-amber-400 transition cursor-pointer"
                >
                  O Testemunho da Estrada
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenCombos}
                  className="hover:text-amber-400 transition cursor-pointer"
                >
                  Combos Promocionais
                </button>
              </li>
              <li>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-amber-400 transition cursor-pointer"
                >
                  Topo da Página
                </button>
              </li>
              <li>
                <a
                  href="https://wa.me/5561991736136?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20a%20A%C3%A7%C3%A3o%20Solid%C3%A1ria%20Mission%C3%A1ria."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 transition cursor-pointer text-slate-400"
                >
                  Dúvidas no WhatsApp
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Localização & Fé */}
          <div className="space-y-2">
            <span className="font-bold text-white text-xs uppercase tracking-wider block">
              Missão &amp; Sede
            </span>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p className="flex items-start space-x-1.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Águas Lindas de Goiás - GO</span>
              </p>
              <p className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Auditoria e Transparência Pública</span>
              </p>
              <p className="flex items-center space-x-1.5">
                <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Evento Vision Day Bertioga/SP</span>
              </p>
            </div>
          </div>

          {/* Coluna 4: Segurança */}
          <div className="space-y-3">
            <span className="font-bold text-white text-xs uppercase tracking-wider block">
              Segurança &amp; Pagamentos
            </span>
            <p className="text-xs text-slate-400">
              Processamento seguro via InfinitePay Pix. Suas cotas são reservadas na hora e
              confirmadas automaticamente via Webhook.
            </p>
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Chave Pix Criptografada</span>
            </div>
          </div>
        </div>

        {/* Linha Inferior */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© 2026 Ação Solidária: Missão &amp; Cooperação. Todos os direitos reservados.</p>
          <p className="flex items-center space-x-1">
            <span>Semeando com amor em cada quilômetro da missão</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

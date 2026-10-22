import React, { useState } from 'react';
import { X, Sparkles, MessageCircle } from 'lucide-react';
import { WHATSAPP_DUVIDAS, WHATSAPP_DUVIDAS_FORMATADO } from '../utils/rules.ts';

export const FloatingWhatsApp: React.FC = () => {
  const [mostrarBalão, setMostrarBalão] = useState(true);

  const mensagemPadrao = encodeURIComponent(
    'Olá! A paz do Senhor. Tenho uma dúvida sobre a Ação Solidária Missão & Cooperação.'
  );
  const linkWhatsApp = `https://wa.me/${WHATSAPP_DUVIDAS}?text=${mensagemPadrao}`;

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end pointer-events-none">
      {/* Balão de Dúvidas / Suporte (com botão de fechar apenas o balão) */}
      {mostrarBalão && (
        <div className="relative mb-3 max-w-[280px] sm:max-w-xs bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/30 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMostrarBalão(false);
            }}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Fechar aviso"
            aria-label="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start space-x-2.5 pr-4">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse mt-1 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                <span>Dúvidas ou Ajuda?</span>
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Fale diretamente conosco pelo WhatsApp{' '}
                <strong className="text-white">{WHATSAPP_DUVIDAS_FORMATADO}</strong>.
              </p>
            </div>
          </div>

          {/* Triângulo decorativo apontando para o botão */}
          <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-900/95" />
        </div>
      )}

      {/* Botão Flutuante Verde do WhatsApp */}
      <a
        href={linkWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Tirar dúvidas no WhatsApp"
        className="pointer-events-auto group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white shadow-xl hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border-2 border-white/20"
      >
        {/* Efeito de Ondulação / Ping */}
        <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-30 group-hover:animate-ping" />

        {/* Ícone Oficial WhatsApp em SVG */}
        <svg
          className="w-7 h-7 sm:w-8 sm:h-8 fill-current relative z-10 transition-transform group-hover:scale-110"
          viewBox="0 0 24 24"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>

        {/* Notificação sutil */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-slate-950" />
        </span>
      </a>
    </div>
  );
};

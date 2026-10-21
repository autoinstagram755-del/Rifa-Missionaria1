import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Camera,
  MapPin,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle,
} from 'lucide-react';

export interface FotoJornada {
  id: number;
  url: string;
  fallbackUrl: string;
  titulo: string;
  categoria: 'quebra' | 'viagem' | 'evento' | 'retorno' | 'espera';
  categoriaNome: string;
  descricao: string;
}

export const FOTOS_JORNADA: FotoJornada[] = [
  {
    id: 1,
    url: '/images/jornada/foto-01.jpg',
    fallbackUrl: 'https://iili.io/nO0iZ3x.md.jpg',
    titulo: '1. O Imprevisto na Rodovia',
    categoria: 'quebra',
    categoriaNome: 'Quebra & Guincho',
    descricao:
      'No meio da estrada rumo a Bertioga/SP, próximo a Uberaba/MG, o carro emprestado sofreu uma pane mecânica inesperada.',
  },
  {
    id: 2,
    url: '/images/jornada/foto-02.jpg',
    fallbackUrl: 'https://iili.io/nO0itYQ.md.jpg',
    titulo: '2. Mobilização no Acostamento',
    categoria: 'quebra',
    categoriaNome: 'Quebra & Guincho',
    descricao:
      'Momento de calma e oração enquanto aguardávamos o suporte na rodovia para garantir a segurança de todos.',
  },
  {
    id: 3,
    url: '/images/jornada/foto-03.jpg',
    fallbackUrl: 'https://iili.io/nO0iL4j.md.jpg',
    titulo: '3. Chegada do Guincho',
    categoria: 'quebra',
    categoriaNome: 'Quebra & Guincho',
    descricao:
      'O caminhão de socorro chegou para içar o veículo emprestado e transportá-lo até a cidade de Uberaba/MG.',
  },
  {
    id: 4,
    url: '/images/jornada/foto-04.jpg',
    fallbackUrl: 'https://iili.io/nO0isEb.md.jpg',
    titulo: '4. Transporte para a Oficina Mecânica',
    categoria: 'quebra',
    categoriaNome: 'Quebra & Guincho',
    descricao:
      'Veículo rebocado até uma oficina mecânica em Uberaba para que os mecânicos iniciassem a avaliação dos danos.',
  },
  {
    id: 5,
    url: '/images/jornada/foto-05.jpg',
    fallbackUrl: 'https://iili.io/nO0iDvV.md.jpg',
    titulo: '5. Aluguel Emergencial do Novo Carro',
    categoria: 'viagem',
    categoriaNome: 'Carro Alugado & Estrada',
    descricao:
      'Para não cancelar a viagem e honrar o compromisso espiritual com a Igreja-Mãe, alugamos outro carro imediatamente.',
  },
  {
    id: 6,
    url: '/images/jornada/foto-06.jpg',
    fallbackUrl: 'https://iili.io/nO0ibyB.md.jpg',
    titulo: '6. Retomando a Viagem na Estrada',
    categoria: 'viagem',
    categoriaNome: 'Carro Alugado & Estrada',
    descricao:
      'De volta à rodovia com o carro alugado, prosseguindo com fé os 1.130 km até o litoral de São Paulo.',
  },
  {
    id: 7,
    url: '/images/jornada/foto-07.jpg',
    fallbackUrl: 'https://iili.io/nO0ipTP.md.jpg',
    titulo: '7. Descida da Serra e Paisagens',
    categoria: 'viagem',
    categoriaNome: 'Carro Alugado & Estrada',
    descricao:
      'Horas de viagem contemplando a fidelidade de Deus que sustentou o casal de pastores durante todo o percurso.',
  },
  {
    id: 8,
    url: '/images/jornada/foto-08.jpg',
    fallbackUrl: 'https://iili.io/nO0iyj1.md.jpg',
    titulo: '8. Chegada a Bertioga/SP',
    categoria: 'viagem',
    categoriaNome: 'Carro Alugado & Estrada',
    descricao:
      'Alívio e gratidão ao cruzar o portal de Bertioga/SP após superarmos todos os obstáculos mecânicos da estrada.',
  },
  {
    id: 9,
    url: '/images/jornada/foto-09.jpg',
    fallbackUrl: 'https://iili.io/nO0s9ZF.md.jpg',
    titulo: '9. Abertura do Vision Day',
    categoria: 'evento',
    categoriaNome: 'Vision Day & Reconhecimento',
    descricao:
      'Início do evento anual com pastores e líderes reunidos para alinhamento e visão ministerial.',
  },
  {
    id: 10,
    url: '/images/jornada/foto-10.jpg',
    fallbackUrl: 'https://iili.io/nO0sJCg.md.jpg',
    titulo: '10. Alinhamento Espiritual com a Igreja-Mãe',
    categoria: 'evento',
    categoriaNome: 'Vision Day & Reconhecimento',
    descricao:
      'Recebendo orientações espirituais preciosas, edificação e fortalecimento pastoral da liderança da Igreja-Mãe.',
  },
  {
    id: 11,
    url: '/images/jornada/foto-11.jpg',
    fallbackUrl: 'https://iili.io/nO0sdGa.md.jpg',
    titulo: '11. Momentos de Comunhão Fraterna',
    categoria: 'evento',
    categoriaNome: 'Vision Day & Reconhecimento',
    descricao:
      'A alegria do reencontro com irmãos de ministério, compartilhando experiências e orações mútuas.',
  },
  {
    id: 12,
    url: '/images/jornada/foto-12.jpg',
    fallbackUrl: 'https://iili.io/nO0s26J.md.jpg',
    titulo: '12. Reconhecimento Pastoral no Altar',
    categoria: 'evento',
    categoriaNome: 'Vision Day & Reconhecimento',
    descricao:
      'Momento solene de honra e reconhecimento do ministério do Pastor Jocimar Araújo e da Pastora Ana Cristina.',
  },
  {
    id: 13,
    url: '/images/jornada/foto-13.jpg',
    fallbackUrl: 'https://iili.io/nO0sF3v.md.jpg',
    titulo: '13. Unção & Bênção sobre o Ministério',
    categoria: 'evento',
    categoriaNome: 'Vision Day & Reconhecimento',
    descricao:
      'Oração e consagração da liderança sobre a vida pastoral do casal, selando o propósito da viagem.',
  },
  {
    id: 14,
    url: '/images/jornada/foto-14.jpg',
    fallbackUrl: 'https://iili.io/nO0ZAFa.md.jpg',
    titulo: '14. Celebração e Encerramento em Bertioga',
    categoria: 'evento',
    categoriaNome: 'Vision Day & Reconhecimento',
    descricao:
      'Coração transbordando de gratidão pelas portas que se abriram e pelas bênçãos recebidas no Vision Day.',
  },
  {
    id: 15,
    url: '/images/jornada/foto-15.jpg',
    fallbackUrl: 'https://iili.io/nO0ZRcJ.md.jpg',
    titulo: '15. Retorno a Uberaba para o Conserto',
    categoria: 'retorno',
    categoriaNome: 'Retorno a Uberaba & Oficina',
    descricao:
      'Após o encerramento do evento, viagem de volta a Minas Gerais para acompanhar o conserto do carro emprestado.',
  },
  {
    id: 16,
    url: '/images/jornada/foto-16.jpg',
    fallbackUrl: 'https://iili.io/nO0Z58v.md.jpg',
    titulo: '16. Visita à Oficina Mecânica',
    categoria: 'retorno',
    categoriaNome: 'Retorno a Uberaba & Oficina',
    descricao:
      'Chegada à oficina em Uberaba/MG para conferir o andamento do diagnóstico mecânico e das peças necessárias.',
  },
  {
    id: 17,
    url: '/images/jornada/foto-17.jpg',
    fallbackUrl: 'https://iili.io/nO0ZY9R.md.jpg',
    titulo: '17. Avaliação Mecânica Detalhada',
    categoria: 'retorno',
    categoriaNome: 'Retorno a Uberaba & Oficina',
    descricao:
      'Conferência dos reparos indispensáveis para que o carro volte a rodar com segurança total.',
  },
  {
    id: 18,
    url: '/images/jornada/foto-18.jpg',
    fallbackUrl: 'https://iili.io/nO0Z1nt.md.jpg',
    titulo: '18. Os Dias de Espera na Cidade',
    categoria: 'espera',
    categoriaNome: 'Espera, Pousada & Volta',
    descricao:
      'Como o reparo exigia peças e retífica, foi necessário aguardar dias em Uberaba até a conclusão dos serviços.',
  },
  {
    id: 19,
    url: '/images/jornada/foto-19.jpg',
    fallbackUrl: 'https://iili.io/nO0Zaup.md.jpg',
    titulo: '19. A Pousada onde Pernoitamos',
    categoria: 'espera',
    categoriaNome: 'Espera, Pousada & Volta',
    descricao:
      'Hospedagem em Uberaba/MG durante o período de espera pelos consertos mecânicos do automóvel.',
  },
  {
    id: 20,
    url: '/images/jornada/foto-20.jpg',
    fallbackUrl: 'https://iili.io/nO0ZcwN.md.jpg',
    titulo: '20. Momentos de Descanso & Fé',
    categoria: 'espera',
    categoriaNome: 'Espera, Pousada & Volta',
    descricao:
      'Dias de reflexão, confiança na providência divina e gratidão pelo cuidado de Deus em cada detalhe.',
  },
  {
    id: 21,
    url: '/images/jornada/foto-21.jpg',
    fallbackUrl: 'https://iili.io/nO0ZltI.md.jpg',
    titulo: '21. Veículo Pronto na Oficina',
    categoria: 'retorno',
    categoriaNome: 'Retorno a Uberaba & Oficina',
    descricao:
      'Finalização dos trabalhos mecânicos e teste do motor para liberar a viagem de volta para Goiás.',
  },
  {
    id: 22,
    url: '/images/jornada/foto-22.jpg',
    fallbackUrl: 'https://iili.io/nO0ZEMX.md.jpg',
    titulo: '22. A Volta para Casa em Águas Lindas',
    categoria: 'espera',
    categoriaNome: 'Espera, Pousada & Volta',
    descricao:
      'Retorno em segurança para Águas Lindas de Goiás com o coração grato e o compromisso de honrar quem nos abençoou.',
  },
];

export const JourneyGallery: React.FC = () => {
  const [fotoAtivaIndex, setFotoAtivaIndex] = useState(0);
  const [modalAberta, setModalAberta] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const scrollThumbnailsRef = useRef<HTMLDivElement>(null);

  const fotosFiltradas =
    categoriaFiltro === 'todas'
      ? FOTOS_JORNADA
      : FOTOS_JORNADA.filter((f) => f.categoria === categoriaFiltro);

  const fotoAtual = FOTOS_JORNADA[fotoAtivaIndex] || FOTOS_JORNADA[0];

  const nextFoto = () => {
    setFotoAtivaIndex((prev) => (prev + 1) % FOTOS_JORNADA.length);
  };

  const prevFoto = () => {
    setFotoAtivaIndex((prev) => (prev - 1 + FOTOS_JORNADA.length) % FOTOS_JORNADA.length);
  };

  // Scroll automático do carrossel de miniaturas para manter a foto ativa visível
  useEffect(() => {
    if (scrollThumbnailsRef.current) {
      const activeBtn = scrollThumbnailsRef.current.querySelector(
        `[data-thumb-index="${fotoAtivaIndex}"]`
      ) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [fotoAtivaIndex]);

  return (
    <div className="mt-14 rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Cabeçalho da Galeria */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>DIÁRIO VISUAL DA MISSÃO • 22 FOTOS REAIS</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Nossa Trajetória em Fotos: <span className="text-amber-400">Da Estrada ao Altar</span>
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Acompanhe em ordem cronológica cada etapa vivida pelo Pastor Jocimar e Pastora Ana Cristina.
          </p>
        </div>

        {/* Contador e Botões de Navegação */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          <span className="text-xs font-mono font-bold text-amber-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            {fotoAtivaIndex + 1} de {FOTOS_JORNADA.length}
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={prevFoto}
              aria-label="Foto anterior"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextFoto}
              aria-label="Próxima foto"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtros por Categorias das Etapas */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        {[
          { key: 'todas', label: 'Todas as Fotos (22)' },
          { key: 'quebra', label: '1. A Quebra & Guincho (Uberaba)' },
          { key: 'viagem', label: '2. Carro Alugado & Estrada' },
          { key: 'evento', label: '3. Bertioga & Vision Day' },
          { key: 'retorno', label: '4. Retorno à Oficina' },
          { key: 'espera', label: '5. A Pousada & Volta para Casa' },
        ].map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setCategoriaFiltro(cat.key);
              if (cat.key !== 'todas') {
                const primeiraFoto = FOTOS_JORNADA.findIndex((f) => f.categoria === cat.key);
                if (primeiraFoto !== -1) setFotoAtivaIndex(primeiraFoto);
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
              categoriaFiltro === cat.key
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Visualizador Principal: Foto Ativa em Destaque + Legenda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-950/70 border border-slate-800/90 rounded-3xl p-4 sm:p-6">
        {/* Foto em Destaque */}
        <div
          className="lg:col-span-7 relative group cursor-pointer aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl"
          onClick={() => setModalAberta(true)}
        >
          <img
            src={fotoAtual.url}
            alt={fotoAtual.titulo}
            onError={(e) => {
              e.currentTarget.src = fotoAtual.fallbackUrl;
            }}
            className="w-full h-full object-cover sm:object-contain transition-transform duration-500 group-hover:scale-102"
          />

          {/* Badge de Etapa */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700 text-xs font-bold text-amber-300 flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{fotoAtual.categoriaNome}</span>
          </div>

          {/* Botão de Ampliar */}
          <div className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/85 backdrop-blur-md text-white hover:bg-amber-400 hover:text-slate-950 transition opacity-85 group-hover:opacity-100">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>

        {/* Informações da Foto */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
              Foto {fotoAtivaIndex + 1} de {FOTOS_JORNADA.length} • {fotoAtual.categoriaNome}
            </span>
            <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {fotoAtual.titulo}
            </h4>
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {fotoAtual.descricao}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setModalAberta(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Foto em Tamanho Real</span>
            </button>
          </div>
        </div>
      </div>

      {/* Faixa Horizontal de Miniaturas (todas as 22 fotos com rolagem suave) */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Selecione qualquer foto para visualizar (1 a 22):</span>
          <span className="font-mono text-amber-300">
            Foto {fotoAtivaIndex + 1} selecionada
          </span>
        </div>

        <div
          ref={scrollThumbnailsRef}
          className="flex items-center space-x-2.5 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
        >
          {FOTOS_JORNADA.map((foto, idx) => (
            <button
              key={foto.id}
              data-thumb-index={idx}
              type="button"
              onClick={() => setFotoAtivaIndex(idx)}
              className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                fotoAtivaIndex === idx
                  ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105 shadow-md shadow-amber-400/20'
                  : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
              }`}
              title={foto.titulo}
            >
              <img
                src={foto.url}
                alt={`Miniatura ${foto.id}`}
                onError={(e) => {
                  e.currentTarget.src = foto.fallbackUrl;
                }}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-slate-950/80 text-[10px] font-mono text-white">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal / Lightbox em Tela Cheia da Galeria */}
      {modalAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-md"
          onClick={() => setModalAberta(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Foto {fotoAtivaIndex + 1} de {FOTOS_JORNADA.length} • {fotoAtual.categoriaNome}
                </span>
                <h4 className="text-lg sm:text-xl font-bold text-white">{fotoAtual.titulo}</h4>
              </div>
              <button
                onClick={() => setModalAberta(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagem Ampliada */}
            <div className="relative aspect-[16/10] max-h-[65vh] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <img
                src={fotoAtual.url}
                alt={fotoAtual.titulo}
                onError={(e) => {
                  e.currentTarget.src = fotoAtual.fallbackUrl;
                }}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Descrição e Navegação Inferior */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                {fotoAtual.descricao}
              </p>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={prevFoto}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center space-x-1 text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
                <button
                  onClick={nextFoto}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center space-x-1 text-xs"
                >
                  <span>Próxima</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

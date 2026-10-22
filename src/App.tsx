import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { StorySection } from './components/StorySection.tsx';
import { ComboSection } from './components/ComboSection.tsx';
import { QuotaGrid } from './components/QuotaGrid.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { PixConfirmationModal } from './components/PixConfirmationModal.tsx';
import { AdminPanelModal } from './components/AdminPanelModal.tsx';
import { CheckOrderModal } from './components/CheckOrderModal.tsx';
import { FloatingWhatsApp } from './components/FloatingWhatsApp.tsx';
import { Footer } from './components/Footer.tsx';
import {
  Cota,
  Pedido,
  obterCotas,
  obterPedidos,
  salvarCotasLocais,
  salvarPedidoLocal,
  verificarELiberarCotasExpiradas,
} from './lib/supabase.ts';
import {
  calcularEstatisticas,
  ComboItem,
  TOTAL_COTAS,
} from './utils/rules.ts';

export default function App() {
  const [cotas, setCotas] = useState<Cota[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cotasSelecionadas, setCotasSelecionadas] = useState<number[]>([]);
  const [quantidadeDesejada, setQuantidadeDesejada] = useState<number>(1);

  // Modais
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [checkOrderModalOpen, setCheckOrderModalOpen] = useState(false);

  // Dados do pedido atual em checkout
  const [dadosPedidoAtual, setDadosPedidoAtual] = useState<any>(null);

  // Carrega dados iniciais do Supabase / LocalStorage
  const carregarDados = useCallback(async () => {
    try {
      const listaCotas = await obterCotas();
      const listaPedidos = await obterPedidos();
      setCotas(listaCotas);
      setPedidos(listaPedidos);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
  }, []);

  useEffect(() => {
    // Garante que o site sempre inicialize no topo (Hero/Cabeçalho)
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    carregarDados();

    // Detecção de retorno do Checkout Integrado da InfinitePay via redirect_url
    const urlParams = new URLSearchParams(window.location.search);
    const orderNsu = urlParams.get('order_nsu');
    const transactionNsu = urlParams.get('transaction_nsu');
    const slug = urlParams.get('slug');

    if (orderNsu) {
      // Consulta o pedido e exibe o comprovante
      fetch(`/api/consultar-pedido?id=${orderNsu}&slug=${slug || ''}&transaction_nsu=${transactionNsu || ''}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.id) {
            handlePagamentoConfirmado(data.id);
            setDadosPedidoAtual({
              pedido_id: data.id,
              nome_comprador: data.nome_comprador || 'Irmão Apoiador',
              whatsapp: '',
              cpf: '',
              valor_total: data.valor_total || 50,
              quantidade_cotas: data.quantidade_cotas || 3,
              cotas_numeros: Array.isArray(data.cotas) ? data.cotas.map((c: any) => c.numero) : [1, 2, 3],
              pix_copia_cola: '',
            });
            setPixModalOpen(true);
          }
        })
        .catch((e) => console.warn('Erro ao carregar pedido do redirect:', e));
    }

    // Acesso discreto de emergência para o gestor via parâmetro na URL (?admin=missao2026 ou ?admin=true)
    const adminQuery = urlParams.get('admin');
    if (adminQuery === 'missao2026' || adminQuery === 'true') {
      setAdminModalOpen(true);
    }

    // Intervalo de verificação periódica a cada 60s para liberar reservas com mais de 3h
    const intervalExpiracao = setInterval(async () => {
      const { pedidosCancelados, cotasLiberadas } = await verificarELiberarCotasExpiradas();
      if (pedidosCancelados > 0 || cotasLiberadas > 0) {
        carregarDados();
      }
    }, 60000);

    return () => clearInterval(intervalExpiracao);
  }, [carregarDados]);

  const stats = calcularEstatisticas(cotas);

  // Alterna seleção de uma cota individual
  const handleToggleCota = (numero: number) => {
    setCotasSelecionadas((prev) => {
      if (prev.includes(numero)) {
        return prev.filter((n) => n !== numero);
      } else {
        return [...prev, numero].sort((a, b) => a - b);
      }
    });
  };

  // Seleciona combo rápido
  const handleSelectCombo = (combo: ComboItem) => {
    // Escolhe aleatoriamente cotas livres para este combo
    const cotasLivres = cotas.filter((c) => c.status === 'disponivel');
    const embaralhadas = [...cotasLivres].sort(() => 0.5 - Math.random());
    const escolhidas = embaralhadas.slice(0, combo.cotas).map((c) => c.numero);

    setCotasSelecionadas(escolhidas);
    setQuantidadeDesejada(combo.cotas);
    setCheckoutModalOpen(true);
  };

  // Surpresinha / Seleção aleatória de N cotas
  const handleSelecionarAleatorio = (quantidade: number) => {
    const cotasLivres = cotas.filter(
      (c) => c.status === 'disponivel' && !cotasSelecionadas.includes(c.numero)
    );
    const embaralhadas = [...cotasLivres].sort(() => 0.5 - Math.random());
    const novasEscolhidas = embaralhadas.slice(0, quantidade).map((c) => c.numero);

    setCotasSelecionadas((prev) => [...prev, ...novasEscolhidas].sort((a, b) => a - b));
  };

  const handleLimparSelecao = () => {
    setCotasSelecionadas([]);
  };

  const handleFinalizarSelecao = () => {
    setQuantidadeDesejada(cotasSelecionadas.length);
    setCheckoutModalOpen(true);
  };

  // Quando o checkout cria o pagamento com sucesso
  const handleSuccessCheckout = (dados: any) => {
    // Salva o pedido localmente se não for Supabase
    const novoPedido: Pedido = {
      id: dados.pedido_id,
      nome_comprador: dados.nome_comprador,
      whatsapp: dados.whatsapp,
      cpf: dados.cpf,
      valor_total: dados.valor_total,
      quantidade_cotas: dados.quantidade_cotas,
      status_pagamento: 'pendente',
      transaction_id_infinitepay: dados.transaction_id,
      pix_copia_cola: dados.pix_copia_cola,
      created_at: new Date().toISOString(),
      cotas_numeros: dados.cotas_numeros,
    };
    salvarPedidoLocal(novoPedido);

    // Atualiza status das cotas na memória para 'reservado'
    const novasCotas = cotas.map((c) => {
      if (dados.cotas_numeros.includes(c.numero)) {
        return { ...c, status: 'reservado' as const, pedido_id: dados.pedido_id };
      }
      return c;
    });
    setCotas(novasCotas);
    salvarCotasLocais(novasCotas);

    setDadosPedidoAtual(dados);
    setCheckoutModalOpen(false);
    setPixModalOpen(true);
    setCotasSelecionadas([]);
  };

  // Quando o pagamento é aprovado (via polling, webhook ou simulação de teste)
  const handlePagamentoConfirmado = (pedidoId: string) => {
    // Atualiza localmente
    setCotas((prev) =>
      prev.map((c) => (c.pedido_id === pedidoId ? { ...c, status: 'pago' as const } : c))
    );
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status_pagamento: 'pago' as const } : p))
    );
  };

  // Navegação suave para seções
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950">
      {/* Header com Navegação */}
      <Header
        onOpenCheckOrder={() => setCheckOrderModalOpen(true)}
        onOpenStory={() => scrollTo('historia-missao')}
        onOpenCombos={() => scrollTo('combos-cotas')}
        onOpenGrid={() => scrollTo('grade-cotas')}
      />

      {/* Hero com Título, Carrossel & Barra de Progresso */}
      <HeroSection
        stats={stats}
        onSelectCombo={() => scrollTo('combos-cotas')}
        onOpenStory={() => scrollTo('historia-missao')}
      />

      {/* Sessão da História & Testemunho Missionário */}
      <StorySection onGoToCombos={() => scrollTo('combos-cotas')} />

      {/* Seção de Combos Promocionais de Cotas */}
      <ComboSection
        onSelectCombo={handleSelectCombo}
        onOpenManualGrid={() => scrollTo('grade-cotas')}
      />

      {/* Grade Completa de Cotas (001 a 500) com Surpresinha */}
      <QuotaGrid
        cotas={cotas}
        cotasSelecionadas={cotasSelecionadas}
        onToggleCota={handleToggleCota}
        onSelecionarAleatorio={handleSelecionarAleatorio}
        onLimparSelecao={handleLimparSelecao}
        onFinalizarSelecao={handleFinalizarSelecao}
      />

      {/* Rodapé com Informações Institucionais e Segurança */}
      <Footer
        onOpenStory={() => scrollTo('historia-missao')}
        onOpenCombos={() => scrollTo('combos-cotas')}
      />

      {/* Modal de Formulário de Checkout */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        cotasEscolhidas={cotasSelecionadas}
        quantidadeDesejada={quantidadeDesejada}
        onSuccessCheckout={handleSuccessCheckout}
      />

      {/* Modal de Confirmação Pix com QR Code e Copia e Cola */}
      <PixConfirmationModal
        isOpen={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        dadosPedido={dadosPedidoAtual}
        onPagamentoConfirmado={handlePagamentoConfirmado}
      />

      {/* Painel Administrativo de Gestão de Cotas & Script SQL */}
      <AdminPanelModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        pedidos={pedidos}
        cotas={cotas}
        onRecarregarDados={carregarDados}
      />

      {/* Modal de Consulta de Pedidos e Cotas por CPF */}
      <CheckOrderModal
        isOpen={checkOrderModalOpen}
        onClose={() => setCheckOrderModalOpen(false)}
        pedidos={pedidos}
        cotas={cotas}
      />

      {/* Botão Flutuante de WhatsApp para Dúvidas e Suporte (61 99173-6136) */}
      <FloatingWhatsApp />
    </div>
  );
}

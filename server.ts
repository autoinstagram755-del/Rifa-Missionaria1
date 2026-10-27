import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import criarPagamentoHandler from './api/criar-pagamento.ts';
import webhookInfinitePayHandler from './api/webhook-infinitepay.ts';
import consultarPedidoHandler from './api/consultar-pedido.ts';
import expirarReservasHandler from './api/expirar-reservas.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rotas de API da aplicação (compatíveis com Vercel Serverless)
  app.all('/api/criar-pagamento', (req, res) => {
    criarPagamentoHandler(req, res);
  });

  app.all('/api/webhook-infinitepay', (req, res) => {
    webhookInfinitePayHandler(req, res);
  });

  app.all('/api/consultar-pedido', (req, res) => {
    consultarPedidoHandler(req, res);
  });

  app.all('/api/expirar-reservas', (req, res) => {
    expirarReservasHandler(req, res);
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rotina em segundo plano no servidor para expirar reservas com mais de 3 horas
  const rodarExpiracao = () => {
    const fakeReq: any = { method: 'GET', headers: {} };
    const fakeRes: any = {
      setHeader: () => {},
      status: () => ({
        json: (dados: any) => {
          if (dados && (dados.pedidos_cancelados > 0 || dados.cotas_liberadas > 0)) {
            console.log(`[Auto-Expirar 3h] ${dados.pedidos_cancelados} pedidos cancelados e ${dados.cotas_liberadas} cotas liberadas.`);
          }
        },
      }),
    };
    expirarReservasHandler(fakeReq, fakeRes).catch(() => {});
  };

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Ação Solidária rodando em http://localhost:${PORT}`);
    // Executa expiração em segundo plano após o servidor estar ativo na porta 3000
    setTimeout(rodarExpiracao, 1500);
    setInterval(rodarExpiracao, 60000);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularValorTotal,
  formatarNumeroCota,
  mascararCPF,
  mascararWhatsApp,
  validarCPF,
  validarWhatsApp,
  calcularEstatisticas,
  COMBOS_DISPONIVEIS,
} from './rules.ts';

test('calcula valor de combos corretamente', () => {
  assert.equal(calcularValorTotal(1), 20);
  assert.equal(calcularValorTotal(3), 50);
  assert.equal(calcularValorTotal(7), 100);
  assert.equal(calcularValorTotal(15), 200);
});

test('calcula valores compostos com economia máxima', () => {
  // 6 cotas = 2 x 3 cotas (R$ 50 + R$ 50) = R$ 100
  assert.equal(calcularValorTotal(6), 100);
  // 2 cotas = 2 x R$ 20 = R$ 40
  assert.equal(calcularValorTotal(2), 40);
  // 0 cotas = 0
  assert.equal(calcularValorTotal(0), 0);
});

test('formatação de números de cota com 3 dígitos', () => {
  assert.equal(formatarNumeroCota(1), '001');
  assert.equal(formatarNumeroCota(42), '042');
  assert.equal(formatarNumeroCota(500), '500');
});

test('máscara de CPF e WhatsApp', () => {
  assert.equal(mascararCPF('12345678909'), '123.456.789-09');
  assert.equal(mascararWhatsApp('61998765432'), '(61) 99876-5432');
});

test('validação de CPF brasileiro', () => {
  // CPF com dígitos inválidos ou todos repetidos
  assert.equal(validarCPF('11111111111'), false);
  assert.equal(validarCPF('12345678900'), false);
  // Um CPF válido de teste padrão: 52998224725
  assert.equal(validarCPF('52998224725'), true);
});

test('validação de WhatsApp', () => {
  assert.equal(validarWhatsApp('(61) 98765-4321'), true);
  assert.equal(validarWhatsApp('123'), false);
});

test('estatísticas de cotas calculam proporções corretas', () => {
  const mockCotas: Array<{ status: 'disponivel' | 'reservado' | 'pago' }> = [
    { status: 'pago' },
    { status: 'pago' },
    { status: 'reservado' },
    { status: 'disponivel' },
  ];
  const stats = calcularEstatisticas(mockCotas);
  assert.equal(stats.total, 4);
  assert.equal(stats.pagas, 2);
  assert.equal(stats.reservadas, 1);
  assert.equal(stats.disponiveis, 1);
  assert.equal(stats.percentualPago, 50);
});

test('geração de Pix padrão Banco Central (BR Code / EMV) com CRC16 válido', async () => {
  const { gerarPixBacen, calcularCRC16, CHAVE_PIX_OFICIAL, NOME_TITULAR_PIX } = await import('./rules.ts');
  const pix = gerarPixBacen(CHAVE_PIX_OFICIAL, NOME_TITULAR_PIX, 'Aguas Lindas', 50.0);

  // Deve iniciar com o cabeçalho padrão 000201
  assert.equal(pix.startsWith('000201'), true);
  // Deve conter o GUI do Pix do Banco Central
  assert.equal(pix.includes('br.gov.bcb.pix'), true);
  // Deve conter a chave telefone formatada com +55
  assert.equal(pix.includes('+5561992274858'), true);
  // Deve conter o nome do titular sem acentos em maiúsculo
  assert.equal(pix.includes('JOCIMAR DA SILVA ARAUJO'), true);
  // Deve conter o valor 50.00
  assert.equal(pix.includes('50.00'), true);
  // Deve terminar com o campo 6304 + 4 caracteres hexadecimais de CRC
  assert.match(pix, /6304[0-9A-F]{4}$/);

  // Validação reversa do CRC16
  const payloadSemCRC = pix.slice(0, -4);
  const crcCalculado = calcularCRC16(payloadSemCRC);
  assert.equal(pix.endsWith(crcCalculado), true);
});


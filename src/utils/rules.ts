/**
 * Regras de negócio, cálculos de cotas e validações para a Ação Solidária
 */

export interface ComboItem {
  id: string;
  nome: string;
  subtitulo: string;
  cotas: number;
  valor: number;
  popular?: boolean;
  destaqueBadge?: string;
  economiaTexto?: string;
}

export const COMBOS_DISPONIVEIS: ComboItem[] = [
  {
    id: 'individual',
    nome: '1 Cota',
    subtitulo: 'Semente Individual',
    cotas: 1,
    valor: 20.0,
  },
  {
    id: 'missao',
    nome: 'Combo Missão (3 Cotas)',
    subtitulo: 'Apoio em Grupo',
    cotas: 3,
    valor: 50.0,
    popular: true,
    destaqueBadge: 'Mais Escolhido',
    economiaTexto: 'Economize R$ 10',
  },
  {
    id: 'lideranca',
    nome: 'Cota Liderança (7 Cotas)',
    subtitulo: 'Passo Firme',
    cotas: 7,
    valor: 100.0,
    destaqueBadge: 'Super Desconto',
    economiaTexto: 'Economize R$ 40',
  },
  {
    id: 'patrocinador',
    nome: 'Cota Patrocinador (15 Cotas)',
    subtitulo: 'Semeador Generoso',
    cotas: 15,
    valor: 200.0,
    destaqueBadge: 'Maior Chance',
    economiaTexto: 'Economize R$ 100',
  },
];

export const PRECO_UNITARIO_COTA = 20.0;
export const TOTAL_COTAS = 500;
export const META_VALOR_TOTAL = 8500.0; // Meta estipulada para cobrir despesas de guincho, retífica, hospedagem emergencial e locação

/**
 * Calcula o valor total com base na quantidade de cotas
 * Se corresponder exatamente a um combo, usa o valor com desconto do combo.
 * Caso contrário, aplica a tabela proporcional mais vantajosa.
 */
export function calcularValorTotal(quantidade: number): number {
  if (quantidade <= 0) return 0;

  // Busca se bate exatamente em algum combo
  const comboExato = COMBOS_DISPONIVEIS.find((c) => c.cotas === quantidade);
  if (comboExato) {
    return comboExato.valor;
  }

  // Se for maior ou intermediário, calcula combinando os melhores pacotes
  let rem = quantidade;
  let total = 0;

  const combosOrdenados = [...COMBOS_DISPONIVEIS].sort((a, b) => b.cotas - a.cotas);

  for (const combo of combosOrdenados) {
    if (rem >= combo.cotas) {
      const qtdCombos = Math.floor(rem / combo.cotas);
      total += qtdCombos * combo.valor;
      rem = rem % combo.cotas;
    }
  }

  if (rem > 0) {
    total += rem * PRECO_UNITARIO_COTA;
  }

  return Number(total.toFixed(2));
}

/**
 * Formata um valor numérico para Moeda Real Brasileiro
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata número de cota para 3 dígitos: 7 -> "007", 45 -> "045"
 */
export function formatarNumeroCota(numero: number): string {
  return String(numero).padStart(3, '0');
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function mascararCPF(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/**
 * Aplica máscara de WhatsApp: (00) 00000-0000 ou (00) 0000-0000
 */
export function mascararWhatsApp(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Validação dos dígitos verificadores do CPF
 */
export function validarCPF(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return false;
  // Rejeita sequências repetidas como 11111111111
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  const digito1 = resto >= 10 ? 0 : resto;
  if (digito1 !== parseInt(limpo.charAt(9), 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto >= 10 ? 0 : resto;
  return digito2 === parseInt(limpo.charAt(10), 10);
}

/**
 * Validação básica de telefone/WhatsApp brasileiro (10 ou 11 dígitos)
 */
export function validarWhatsApp(telefone: string): boolean {
  const limpo = telefone.replace(/\D/g, '');
  return limpo.length === 10 || limpo.length === 11;
}

export interface EstatisticasCotas {
  total: number;
  pagas: number;
  reservadas: number;
  disponiveis: number;
  percentualPago: number;
  valorArrecadado: number;
  percentualMeta: number;
}

export function calcularEstatisticas(
  cotas: Array<{ status: 'disponivel' | 'reservado' | 'pago' }>
): EstatisticasCotas {
  const total = cotas.length || TOTAL_COTAS;
  let pagas = 0;
  let reservadas = 0;
  let disponiveis = 0;

  for (const c of cotas) {
    if (c.status === 'pago') pagas++;
    else if (c.status === 'reservado') reservadas++;
    else disponiveis++;
  }

  // Estimativa de valor arrecadado (média aproximada ou valor unitário)
  const valorArrecadado = pagas * (META_VALOR_TOTAL / TOTAL_COTAS);
  const percentualPago = total > 0 ? Math.round((pagas / total) * 100) : 0;
  const percentualMeta = Math.min(100, Math.round((valorArrecadado / META_VALOR_TOTAL) * 100));

  return {
    total,
    pagas,
    reservadas,
    disponiveis,
    percentualPago,
    valorArrecadado,
    percentualMeta,
  };
}

// Configurações Oficiais do Recebedor Pix
export const CHAVE_PIX_OFICIAL = '61992274858';
export const CHAVE_PIX_FORMATADA = '(61) 99227-4858';
export const NOME_TITULAR_PIX = 'Jocimar da Silva Araujo';
export const CIDADE_PIX = 'Aguas Lindas';

/**
 * Calcula o checksum CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF)
 * exigido pelo padrão BR Code do Banco Central do Brasil para o Pix
 */
export function calcularCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata um campo no padrão EMV (Tag + Tamanho de 2 dígitos + Valor)
 */
function emvField(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return id + len + value;
}

/**
 * Gera o payload oficial do Pix Copia e Cola (BR Code)
 * Válido em qualquer banco brasileiro
 */
export function gerarPixBacen(
  chave: string = CHAVE_PIX_OFICIAL,
  nome: string = NOME_TITULAR_PIX,
  cidade: string = CIDADE_PIX,
  valor?: number,
  txid: string = '***'
): string {
  const nomeLimpo = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 25);
  const cidadeLimpa = cidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 15);

  let chaveFormatada = chave.trim();
  // Se for telefone celular brasileiro (10 ou 11 dígitos), formata para o padrão internacional +55...
  if (/^\d{10,11}$/.test(chaveFormatada)) {
    chaveFormatada = '+55' + chaveFormatada;
  }

  const gui = emvField('00', 'br.gov.bcb.pix');
  const key = emvField('01', chaveFormatada);
  const merchantAccount = emvField('26', gui + key);

  let payload =
    emvField('00', '01') +
    merchantAccount +
    emvField('52', '0000') +
    emvField('53', '986');

  if (valor && valor > 0) {
    payload += emvField('54', Number(valor).toFixed(2));
  }

  payload +=
    emvField('58', 'BR') +
    emvField('59', nomeLimpo) +
    emvField('60', cidadeLimpa);

  const additionalData = emvField('05', txid || '***');
  payload += emvField('62', additionalData);
  payload += '6304';

  const crc = calcularCRC16(payload);
  return payload + crc;
}


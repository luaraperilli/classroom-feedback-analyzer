/**
 * Rotulagem da polaridade de um comentário.
 *
 * A regra: uma classe só é declarada vencedora quando reúne mais da metade da
 * probabilidade. Sem maioria, o comentário é apresentado como misto.
 *
 * O motivo é teórico, não estético. A classificação em nível de documento supõe
 * que o texto expressa opinião sobre uma única entidade, e atribui ao texto
 * inteiro uma única polaridade (Liu, 2012). Um comentário do piloto violou essa
 * premissa de forma exemplar: "Como não sou disciplinado, entendo que a culpa
 * por não ter acompanhado as aulas como deveria é inteiramente minha. O
 * professor é ótimo, mas entendo que eu preciso me dedicar mais." São duas
 * entidades com polaridades opostas, o próprio aluno e o docente, e o modelo
 * respondeu 49% positivo, 28% negativo e 24% neutro. A regra anterior chamava
 * isso de "Positivo", com a mesma aparência de um comentário de 93% de certeza.
 *
 * A distribuição repartida é o rastro empírico da premissa sendo esticada:
 * quando nenhuma classe alcança a maioria, o comentário está pedindo mais
 * granularidade do que o nível de documento oferece.
 *
 * A faixa anterior, de mais ou menos 0,05 sobre o compound, vinha do VADER, um
 * analisador léxico em que o compound é uma soma normalizada de valências. Aqui
 * o compound é a diferença entre duas probabilidades de um modelo de três
 * classes, então o número tinha sido transplantado sem a justificativa junto.
 */

// Fração da probabilidade necessária para uma classe ser declarada vencedora.
export const MAIORIA = 0.5;

// Mantida para as visões agregadas, em que existe apenas a média do compound e
// não a distribuição de probabilidades: o painel de risco e a série temporal.
// Média de compound não é classificação, é resumo, e aplicar a regra da maioria
// a ela seria confundir as duas coisas.
export const SENTIMENT_THRESHOLDS = { positive: 0.05, negative: -0.05 };

export const getSentimentLabel = (compound) => {
  if (compound === null || compound === undefined) return 'neutro';
  if (compound >= SENTIMENT_THRESHOLDS.positive) return 'positivo';
  if (compound <= SENTIMENT_THRESHOLDS.negative) return 'negativo';
  return 'neutro';
};

/**
 * Rótulo de um feedback individual, a partir da distribuição do modelo.
 *
 * Registros anteriores à gravação das probabilidades caem na regra antiga, para
 * que o histórico continue exibível.
 */
export const rotuloDoFeedback = (fb) => {
  if (!fb) return 'neutro';

  const { pos, neg, neu } = fb;
  if ([pos, neg, neu].some((v) => v === null || v === undefined)) {
    return getSentimentLabel(fb.compound);
  }

  if (pos > MAIORIA) return 'positivo';
  if (neg > MAIORIA) return 'negativo';
  if (neu > MAIORIA) return 'neutro';
  return 'misto';
};

const CORES = {
  positivo: '#0f766e',
  neutro: '#64748b',
  negativo: '#dc2626',
  misto: '#b45309',
};

export const getSentimentClass = (compound) => `${getSentimentLabel(compound)}-feedback`;

export const getSentimentColor = (compound) => CORES[getSentimentLabel(compound)];

export const corDoFeedback = (fb) => CORES[rotuloDoFeedback(fb)];

export const mensagemDoFeedback = (fb) => {
  const rotulo = rotuloDoFeedback(fb);
  if (rotulo === 'misto') {
    return 'Seu comentário traz pontos em sentidos diferentes, e nenhum predomina.';
  }
  if (rotulo === 'positivo') return 'Seu comentário foi percebido como positivo.';
  if (rotulo === 'negativo') return 'Seu comentário foi percebido como negativo.';
  return 'Seu comentário foi percebido como neutro.';
};

export const getWeekLabel = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week = Math.round(((d - new Date(d.getFullYear(), 0, 4)) / 86400000 + 1) / 7);
  return `Sem. ${week}`;
};

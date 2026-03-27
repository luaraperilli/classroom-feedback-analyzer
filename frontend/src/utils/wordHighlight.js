/**
 * Frontend-side word sentiment scoring used to produce inline colour
 * highlights on student comment text.  This is a lexicon heuristic — not
 * SHAP or LIME — intended as a visual proxy while the backend does not yet
 * expose token-level attributions.  Scores range from -1 (strongly negative)
 * to +1 (strongly positive).
 */

const LEXICON = {
  adorando: 0.9, adorei: 0.9, excelente: 0.9, ótimo: 0.85, ótima: 0.85,
  acolhedor: 0.8, acolhedora: 0.8, motivado: 0.8, motivada: 0.8,
  satisfeito: 0.7, satisfeita: 0.7, interessado: 0.7, interessada: 0.7,
  aprendendo: 0.75, estimula: 0.65, gosto: 0.6, bom: 0.6, boa: 0.6,
  consigo: 0.45, cumpro: 0.45, dedico: 0.5, aplicar: 0.5, prática: 0.4,
  sempre: 0.35, participar: 0.4, participo: 0.4, relacionar: 0.45,

  desistir: -0.95, burro: -0.9, burra: -0.9,
  desmotivado: -0.9, desmotivada: -0.9, perdido: -0.85, perdida: -0.85,
  difícil: -0.7, difíceis: -0.7, atrasado: -0.65, atrasada: -0.65,
  confuso: -0.65, confusos: -0.65, dificuldade: -0.65,
  nada: -0.55, nunca: -0.7, perdendo: -0.6, não: -0.45,
};

function scoreWord(word) {
  return LEXICON[word.toLowerCase()] ?? null;
}

function buildHighlightStyle(score) {
  const intensity = Math.min(Math.abs(score), 1);
  const alpha = +(0.2 + intensity * 0.55).toFixed(2);
  return score > 0
    ? { backgroundColor: `rgba(22,163,74,${alpha})`, borderRadius: '3px', padding: '0 2px' }
    : { backgroundColor: `rgba(220,38,38,${alpha})`, borderRadius: '3px', padding: '0 2px' };
}

const WORD_RE = /[\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+|[^\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+/g;

export function tokenizeAndScore(text) {
  const tokens = text.match(WORD_RE) || [];
  return tokens.map((token) => {
    const isWord = /^[\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+$/u.test(token);
    if (!isWord) return { token, style: null };
    const score = scoreWord(token);
    return { token, style: score !== null ? buildHighlightStyle(score) : null };
  });
}

/**
 * Destaque por palavra, a partir das atribuições do modelo.
 *
 * Não existe fallback por léxico: destacar palavras com um dicionário fixo e
 * apresentá-las como "as que mais pesaram no resultado" contradiz a proposta de
 * explicabilidade. Sem atribuição, o texto vai sem destaque.
 */

// α = 0,2 + |score| × 0,55 — o termo aditivo garante visibilidade mínima e o
// multiplicador mantém o texto legível sobre fundo branco.
function estiloDeDestaque(score) {
  const intensidade = Math.min(Math.abs(score), 1);
  const alpha = +(0.2 + intensidade * 0.55).toFixed(2);
  const cor = score > 0 ? '5,150,105' : '220,38,38';
  return { backgroundColor: `rgba(${cor},${alpha})`, borderRadius: '3px', padding: '0 2px' };
}

const TOKEN_RE = /[\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+|[^\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+/g;
const PALAVRA_RE = /^[\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+$/u;

export function temAtribuicoes(atribuicoes) {
  return !!atribuicoes && Object.keys(atribuicoes).length > 0;
}

export function tokenizeAndScore(text, backendAttributions = null) {
  if (typeof text !== 'string' || !text) return [];

  const tokens = text.match(TOKEN_RE) || [];
  const comAtribuicoes = temAtribuicoes(backendAttributions);

  return tokens.map((token) => {
    if (!PALAVRA_RE.test(token) || !comAtribuicoes) return { token, style: null };

    const score = backendAttributions[token.toLowerCase()] ?? backendAttributions[token] ?? null;
    return { token, style: score !== null ? estiloDeDestaque(score) : null };
  });
}

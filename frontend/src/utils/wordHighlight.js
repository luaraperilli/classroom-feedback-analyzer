/**
 * Destaque por palavra, a partir das atribuições do modelo.
 *
 * Não existe fallback por léxico: destacar palavras com um dicionário fixo e
 * apresentá-las como "as que mais pesaram no resultado" contradiz a proposta de
 * explicabilidade. Sem atribuição, o texto vai sem destaque.
 */

// α = 0,2 + |score| × 0,50 — o termo aditivo garante visibilidade mínima e o
// multiplicador mantém o texto legível sobre fundo branco.
//
// O multiplicador caiu de 0,55 para 0,50 junto com a troca do verde esmeralda
// pelo teal da marca, que é mais escuro: em 0,55 o texto sobre o destaque de
// impacto máximo ficava com contraste 4,34, abaixo do mínimo de 4,5 da WCAG AA.
// Em 0,50 volta a 4,76, preservando a legibilidade que justifica a fórmula.
function estiloDeDestaque(score) {
  const intensidade = Math.min(Math.abs(score), 1);
  const alpha = +(0.2 + intensidade * 0.50).toFixed(2);
  const cor = score > 0 ? '15,118,110' : '220,38,38';
  return { backgroundColor: `rgba(${cor},${alpha})`, borderRadius: '3px', padding: '0 2px' };
}

const TOKEN_RE = /[\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+|[^\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+/g;
const PALAVRA_RE = /^[\wáàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ]+$/u;

export function temAtribuicoes(atribuicoes) {
  return !!atribuicoes && Object.keys(atribuicoes).length > 0;
}

/**
 * Atribuições a destacar: apenas as palavras em que LIME e SHAP concordam no
 * sinal.
 *
 * O motivo veio de um caso real. No comentário "O professor é ótimo, mas
 * entendo que eu preciso me dedicar mais", o LIME atribuiu peso negativo à
 * palavra "professor", e a tela a pintou de vermelho. O SHAP deu +0,02 para a
 * mesma palavra, ou seja, nada.
 *
 * Comparando as duas técnicas nos comentários do piloto, as duas concordaram no
 * sinal em 18 das 20 palavras destacadas, e as duas divergências caíram
 * exatamente onde o SHAP estava perto de zero, em 2% e 4% do máximo. Acima de
 * 5% do máximo no SHAP, a concordância foi de 17 em 17.
 *
 * A explicação é conhecida: o LIME ajusta uma regressão linear sobre remoções
 * aleatórias de palavras e, quando duas palavras aparecem juntas, ele não
 * distingue qual delas causou o efeito e reparte o crédito. Perto de zero, esse
 * rateio decide o sinal quase por acaso.
 *
 * Exigir convergência transforma a comparação entre os dois métodos, que é o
 * objeto do trabalho, em critério de exibição: ao discente mostra-se apenas
 * aquilo em que dois métodos independentes chegam à mesma conclusão.
 *
 * Sem uma das duas, devolve a que existe. Uma falha do SHAP não pode apagar o
 * destaque inteiro.
 */
export function atribuicoesConvergentes(lime, shap) {
  if (!temAtribuicoes(lime)) return temAtribuicoes(shap) ? shap : null;
  if (!temAtribuicoes(shap)) return lime;

  const convergentes = {};
  for (const [palavra, peso] of Object.entries(lime)) {
    const pesoShap = shap[palavra];
    if (pesoShap === undefined) continue;
    if ((peso > 0) === (pesoShap > 0)) convergentes[palavra] = peso;
  }

  // Se nada sobrou, as duas técnicas discordam de ponta a ponta. Preferir o
  // LIME nesse caso esconderia a discordância do discente, então melhor não
  // destacar nada e deixar o comentário sem cor.
  return convergentes;
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

/**
 * Formatação numérica em português do Brasil, onde o separador decimal é a
 * vírgula.
 *
 * O toFixed() sempre devolve ponto, porque segue a notação do JavaScript e não a
 * do idioma. As telas exibiam "4.2/5" e "0.3 ponto", o que destoa de um sistema
 * inteiramente em português e das capturas que ilustram o trabalho.
 *
 * Vale só para número que aparece na tela. Valor usado em cálculo, em CSS ou em
 * eixo de gráfico continua com ponto, senão deixa de ser número.
 */
export const numeroPtBr = (valor, casas = 1) => {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return '';
  }
  return Number(valor).toFixed(casas).replace('.', ',');
};

/** Mesma formatação, com o sinal explícito. Usada nos escores de sentimento,
 *  em que distinguir positivo de negativo é o ponto todo. */
export const numeroComSinal = (valor, casas = 2) => {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return '';
  }
  const numero = Number(valor);
  return `${numero > 0 ? '+' : ''}${numeroPtBr(numero, casas)}`;
};

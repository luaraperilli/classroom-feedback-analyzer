import { mesmoEnvio, ITENS } from './mesmoEnvio';

const envio = (comentario, nota = 4) => {
  const base = { additional_comment: comentario };
  ITENS.forEach((item) => { base[item] = nota; });
  return base;
};

describe('mesmoEnvio', () => {
  it('reconhece o reenvio idêntico, que é a resposta perdida no caminho', () => {
    expect(mesmoEnvio(envio('A aula foi ótima.'), envio('A aula foi ótima.'))).toBe(true);
  });

  it('ignora espaço extra e caixa, que o usuário não controla ao recolar', () => {
    expect(mesmoEnvio(envio('A aula  foi ótima.'), envio(' a AULA foi ótima. '))).toBe(true);
  });

  it('recusa quando o comentário mudou', () => {
    // O caso que motivou tudo: já havia envio de hoje, a pessoa escreveu outra
    // coisa, e a tela agradecia por um texto que foi descartado.
    expect(mesmoEnvio(envio('A aula foi ótima.'), envio('Não consegui acompanhar.'))).toBe(false);
  });

  it('recusa quando só as notas mudaram', () => {
    // Sem comparar as notas, dois envios de mesmo comentário e respostas
    // diferentes passariam por iguais.
    expect(mesmoEnvio(envio('A aula foi ótima.', 5), envio('A aula foi ótima.', 2))).toBe(false);
  });

  it('recusa quando uma única nota difere', () => {
    const gravado = envio('Igual.');
    const enviado = { ...envio('Igual.'), content_connection: 1 };
    expect(mesmoEnvio(gravado, enviado)).toBe(false);
  });

  it('compara os seis itens do questionário, e não um subconjunto', () => {
    expect(ITENS).toHaveLength(6);
    ITENS.forEach((item) => {
      const enviado = { ...envio('Igual.'), [item]: 1 };
      expect(mesmoEnvio(envio('Igual.'), enviado)).toBe(false);
    });
  });

  it('não quebra sem nada gravado', () => {
    expect(mesmoEnvio(null, envio('A aula foi ótima.'))).toBe(false);
    expect(mesmoEnvio(undefined, envio('A aula foi ótima.'))).toBe(false);
    expect(mesmoEnvio(envio('A aula foi ótima.'), null)).toBe(false);
  });

  it('trata comentário ausente e vazio como a mesma coisa', () => {
    const semCampo = envio(undefined);
    delete semCampo.additional_comment;
    expect(mesmoEnvio(semCampo, envio(''))).toBe(true);
  });

  it('distingue dois envios sem comentário pelas notas', () => {
    expect(mesmoEnvio(envio('', 5), envio('', 2))).toBe(false);
  });
});

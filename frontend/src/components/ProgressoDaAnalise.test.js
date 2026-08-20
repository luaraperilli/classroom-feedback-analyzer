import { estimarSegundos } from './ProgressoDaAnalise';

describe('estimativa de tempo da análise', () => {
  it('reproduz a medição de produção com margem de 15%', () => {
    // 301 caracteres levaram 172,8s em produção, sendo 141,0 de LIME e 31,7 de
    // SHAP. A estimativa não precisa acertar em cheio, mas errar muito faria a
    // barra encostar no teto cedo demais ou andar lenta demais.
    const medido = 172.8;
    const estimado = estimarSegundos(301);
    expect(Math.abs(estimado - medido) / medido).toBeLessThan(0.15);
  });

  it('cresce com o tamanho do comentário, como o LIME cresce', () => {
    expect(estimarSegundos(400)).toBeGreaterThan(estimarSegundos(100));
  });

  it('mantém um piso para comentário curto, por causa do custo fixo do SHAP', () => {
    // O SHAP usa um número fixo de avaliações, então até um comentário de duas
    // palavras custa dezenas de segundos. Estimar quase zero faria a barra
    // travar em 95% já nos primeiros segundos.
    expect(estimarSegundos(10)).toBeGreaterThanOrEqual(20);
  });

  it('não quebra sem o número de caracteres', () => {
    expect(estimarSegundos(undefined)).toBeGreaterThan(0);
    expect(estimarSegundos(0)).toBeGreaterThan(0);
  });

  it('fica dentro dos cinco minutos no pior caso permitido pela tela', () => {
    // O campo limita o comentário a 400 caracteres. Se a estimativa para esse
    // limite passasse de cinco minutos, a promessa feita ao aluno seria falsa.
    expect(estimarSegundos(400)).toBeLessThan(300);
  });
});

import { estimarSegundos } from './ProgressoDaAnalise';

// Medições de produção em 20 de agosto de 2026, já com a deduplicação das
// perturbações e o agrupamento dos lotes por comprimento.
const MEDIDO = [
  { caracteres: 354, segundos: 109.5 },   // LIME 91,7 + SHAP 17,8
  { caracteres: 389, segundos: 136.8 },   // LIME 121,0 + SHAP 15,8
];

describe('estimativa de tempo da análise', () => {
  it.each(MEDIDO)('reproduz a medição de $caracteres caracteres', ({ caracteres, segundos }) => {
    // A tolerância é de 20% porque instâncias do Cloud Run variam entre si: as
    // duas medições acima dão 0,26 e 0,31 segundo por caractere para o mesmo
    // código. Exigir precisão maior seria ajustar a fórmula ao ruído.
    const estimado = estimarSegundos(caracteres);
    expect(Math.abs(estimado - segundos) / segundos).toBeLessThan(0.2);
  });

  it('erra para cima, e não para baixo', () => {
    // Melhor a barra terminar antes do previsto do que encostar em 95% e ficar
    // parada esperando, que é o pior desfecho para a confiança no indicador.
    const folgas = MEDIDO.map(({ caracteres, segundos }) => estimarSegundos(caracteres) - segundos);
    expect(folgas.filter((f) => f > 0).length).toBeGreaterThanOrEqual(1);
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

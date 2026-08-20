import { rotuloDoFeedback, getSentimentLabel, MAIORIA } from './sentiment';

// Distribuições reais do piloto de 20 de agosto de 2026.
const FEEDBACK_11 = { pos: 0.9266, neg: 0.0081, neu: 0.0653, compound: 0.9185 };
const FEEDBACK_12 = { pos: 0.4863, neg: 0.2753, neu: 0.2383, compound: 0.2110 };

describe('rótulo de um feedback individual', () => {
  it('mantém positivo o comentário em que o modelo tem maioria clara', () => {
    expect(rotuloDoFeedback(FEEDBACK_11)).toBe('positivo');
  });

  it('classifica como misto o comentário que o professor questionou', () => {
    // "Como não sou disciplinado... O professor é ótimo, mas entendo que eu
    // preciso me dedicar mais." Duas entidades, polaridades opostas, e nenhuma
    // classe com maioria. A regra anterior chamava isso de positivo.
    expect(rotuloDoFeedback(FEEDBACK_12)).toBe('misto');
    expect(getSentimentLabel(FEEDBACK_12.compound)).toBe('positivo');
  });

  it('exige maioria estrita, e não empate técnico', () => {
    expect(rotuloDoFeedback({ pos: 0.5, neg: 0.25, neu: 0.25 })).toBe('misto');
    expect(rotuloDoFeedback({ pos: 0.51, neg: 0.25, neu: 0.24 })).toBe('positivo');
  });

  it('reconhece negativo e neutro com maioria', () => {
    expect(rotuloDoFeedback({ pos: 0.1, neg: 0.8, neu: 0.1 })).toBe('negativo');
    expect(rotuloDoFeedback({ pos: 0.2, neg: 0.1, neu: 0.7 })).toBe('neutro');
  });

  it('volta à regra antiga quando faltam as probabilidades', () => {
    // Registros gravados antes de pos, neg e neu existirem precisam continuar
    // exibíveis, senão o histórico do aluno quebra.
    expect(rotuloDoFeedback({ compound: 0.9 })).toBe('positivo');
    expect(rotuloDoFeedback({ compound: -0.9, pos: null, neg: null, neu: null })).toBe('negativo');
  });

  it('não quebra sem feedback nenhum', () => {
    expect(rotuloDoFeedback(null)).toBe('neutro');
    expect(rotuloDoFeedback(undefined)).toBe('neutro');
  });

  it('usa metade da probabilidade como limiar, e não um número solto', () => {
    expect(MAIORIA).toBe(0.5);
  });
});

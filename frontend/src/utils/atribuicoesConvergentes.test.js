import { atribuicoesConvergentes } from './wordHighlight';

// Dados reais do piloto de 20 de agosto de 2026, feedback 12. O comentário era
// "Como não sou disciplinado, entendo que a culpa por não ter acompanhado as
// aulas como deveria é inteiramente minha. O professor é ótimo, mas entendo que
// eu preciso me dedicar mais."
const LIME_12 = {
  'ótimo': 1.0, mas: -0.4805, 'não': -0.3409, entendo: 0.199, que: -0.192,
  culpa: -0.1804, professor: -0.1487, dedicar: 0.1192, minha: -0.1102,
  inteiramente: 0.0932,
};

const SHAP_12 = {
  'ótimo': 0.5674, mas: -0.1553, 'não': -0.2087, entendo: 0.1303, que: -0.0618,
  culpa: -0.0979, professor: 0.0123, dedicar: 0.0403, minha: -0.0383,
  inteiramente: 0.0391, como: 0.0756, sou: -0.0107, disciplinado: -0.0182,
};

describe('convergência entre LIME e SHAP', () => {
  it('remove "professor", que era o caso levantado pelo professor', () => {
    const resultado = atribuicoesConvergentes(LIME_12, SHAP_12);
    expect(resultado).not.toHaveProperty('professor');
  });

  it('preserva as demais nove palavras, com o peso do LIME', () => {
    const resultado = atribuicoesConvergentes(LIME_12, SHAP_12);
    expect(Object.keys(resultado)).toHaveLength(9);
    expect(resultado['ótimo']).toBe(1.0);
    expect(resultado.mas).toBe(-0.4805);
  });

  it('remove "ambiente" do feedback 11, a outra divergência do piloto', () => {
    const lime = { totalmente: 1.0, acolhedor: 0.9777, ambiente: 0.3122 };
    const shap = { totalmente: 0.3496, acolhedor: 0.1453, ambiente: -0.0156 };
    const resultado = atribuicoesConvergentes(lime, shap);
    expect(Object.keys(resultado).sort()).toEqual(['acolhedor', 'totalmente']);
  });

  it('descarta palavra que o SHAP nem viu, em vez de assumir concordância', () => {
    const resultado = atribuicoesConvergentes({ inventada: 0.9 }, { outra: 0.5 });
    expect(resultado).toEqual({});
  });

  it('devolve o LIME inteiro quando o SHAP falhou', () => {
    // Uma falha do SHAP não pode apagar o destaque, senão o aluno fica sem
    // explicação nenhuma por causa de um problema em uma das duas técnicas.
    expect(atribuicoesConvergentes(LIME_12, null)).toBe(LIME_12);
    expect(atribuicoesConvergentes(LIME_12, {})).toBe(LIME_12);
  });

  it('devolve o SHAP quando o LIME falhou', () => {
    expect(atribuicoesConvergentes(null, SHAP_12)).toBe(SHAP_12);
  });

  it('não quebra quando as duas faltam', () => {
    expect(atribuicoesConvergentes(null, null)).toBeNull();
  });

  it('trata zero como não positivo, dos dois lados, sem inverter o sinal', () => {
    expect(atribuicoesConvergentes({ a: 0.5 }, { a: 0 })).toEqual({});
    expect(atribuicoesConvergentes({ a: -0.5 }, { a: 0 })).toEqual({ a: -0.5 });
  });
});

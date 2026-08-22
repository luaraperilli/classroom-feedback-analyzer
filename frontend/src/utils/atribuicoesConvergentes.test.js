import { atribuicoesConvergentes, maisFortes, MAXIMO_DE_DESTAQUES } from './wordHighlight';

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

  it('preserva o peso do LIME nas palavras que sobrevivem', () => {
    // Nove palavras convergem; a tela mostra as cinco mais fortes entre elas.
    const resultado = atribuicoesConvergentes(LIME_12, SHAP_12);
    expect(Object.keys(resultado)).toHaveLength(MAXIMO_DE_DESTAQUES);
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

  it('devolve o LIME quando o SHAP falhou, ainda sob o limite de destaques', () => {
    // Uma falha do SHAP não pode apagar o destaque, senão o aluno fica sem
    // explicação nenhuma por causa de um problema em uma das duas técnicas. Mas
    // o limite continua valendo: sem ele, justamente o comentário sem
    // convergência seria o mais poluído da tela.
    const semShap = atribuicoesConvergentes(LIME_12, null);
    expect(Object.keys(semShap)).toHaveLength(MAXIMO_DE_DESTAQUES);
    expect(semShap['ótimo']).toBe(1.0);
    expect(atribuicoesConvergentes(LIME_12, {})).toEqual(semShap);
  });

  it('devolve o SHAP quando o LIME falhou', () => {
    const semLime = atribuicoesConvergentes(null, SHAP_12);
    expect(Object.keys(semLime)).toHaveLength(MAXIMO_DE_DESTAQUES);
    expect(semLime['ótimo']).toBe(SHAP_12['ótimo']);
  });

  it('não quebra quando as duas faltam', () => {
    expect(atribuicoesConvergentes(null, null)).toBeNull();
  });

  it('trata zero como não positivo, dos dois lados, sem inverter o sinal', () => {
    expect(atribuicoesConvergentes({ a: 0.5 }, { a: 0 })).toEqual({});
    expect(atribuicoesConvergentes({ a: -0.5 }, { a: 0 })).toEqual({ a: -0.5 });
  });
});

describe('seleção das mais fortes', () => {
  // Pesos reais do feedback 44 em produção, que motivou a mudança: o "também"
  // sobreviveu à convergência (LIME −0,1908 e SHAP −0,0182, ambos negativos) e
  // apareceu vermelho num comentário 98% positivo.
  const LIME_44 = {
    aula: 1.0, boa: 0.9571, muito: 0.8437, bastante: 0.611, interessa: 0.5557,
    me: 0.4946, isso: -0.2217, 'matéria': 0.2193, 'também': -0.1908, escolhi: -0.1881,
  };
  const SHAP_44 = {
    a: -0.0213, aula: 0.2377, foi: -0.0127, muito: 0.1309, boa: 0.0593, o: 0.0047,
    professor: 0.0367, 'também': -0.0182, e: -0.002, 'matéria': 0.0534, me: 0.0642,
    interessa: 0.1167, bastante: 0.1488, por: 0.013, isso: 0.001, escolhi: 0.0112,
  };

  it('mostra no máximo cinco palavras', () => {
    expect(Object.keys(atribuicoesConvergentes(LIME_44, SHAP_44))).toHaveLength(5);
    expect(MAXIMO_DE_DESTAQUES).toBe(5);
  });

  it('deixa de colorir o "também" do feedback 44', () => {
    const saida = atribuicoesConvergentes(LIME_44, SHAP_44);
    expect(saida['também']).toBeUndefined();
    expect(Object.keys(saida)).toEqual(['aula', 'boa', 'muito', 'bastante', 'interessa']);
  });

  it('escolhe por peso absoluto, sem preferir um dos lados', () => {
    const pesos = { forte_neg: -0.9, fraca_pos: 0.1, forte_pos: 0.8 };
    expect(Object.keys(maisFortes(pesos, 2))).toEqual(['forte_neg', 'forte_pos']);
  });

  it('não inventa palavra quando há menos que o limite', () => {
    expect(maisFortes({ a: 1.0, b: -0.5 })).toEqual({ a: 1.0, b: -0.5 });
  });

  it('seleciona depois da convergência, não antes', () => {
    // "forte" domina o LIME mas diverge no SHAP. Selecionando antes, ela ocuparia
    // uma vaga para ser descartada em seguida e a tela mostraria quatro palavras.
    const lime = { forte: 1.0, a: 0.9, b: 0.8, c: 0.7, d: 0.6, e: 0.5 };
    const shap = { forte: -0.5, a: 0.1, b: 0.1, c: 0.1, d: 0.1, e: 0.1 };
    const saida = atribuicoesConvergentes(lime, shap);
    expect(saida.forte).toBeUndefined();
    expect(Object.keys(saida)).toHaveLength(5);
  });

  it('aplica o limite também quando só uma das técnicas existe', () => {
    const seisPesos = { a: 1, b: 0.9, c: 0.8, d: 0.7, e: 0.6, f: 0.5 };
    expect(Object.keys(atribuicoesConvergentes(seisPesos, null))).toHaveLength(5);
    expect(Object.keys(atribuicoesConvergentes(null, seisPesos))).toHaveLength(5);
  });

  it('continua devolvendo vazio quando as duas discordam em tudo', () => {
    expect(atribuicoesConvergentes({ x: 1.0 }, { x: -1.0 })).toEqual({});
  });
});

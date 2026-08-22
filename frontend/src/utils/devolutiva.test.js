import {
  CORTE, DIMENSOES, avaliarDimensoes, palavrasDeDestaque,
  frasesDoComentario, fraseDeLigacao, sugestao, montarDevolutiva,
} from './devolutiva';

// Notas que produzem cada nível, para os casos não dependerem de números soltos.
const notas = (comportamental, emocional, cognitiva) => ({
  active_participation: comportamental, task_completion: comportamental,
  motivation_interest: emocional, welcoming_environment: emocional,
  comprehension_effort: cognitiva, content_connection: cognitiva,
  overall_score: ((comportamental + emocional + cognitiva) / 3 - 1) / 4,
});

const POSITIVO = { pos: 0.98, neg: 0.01, neu: 0.01, compound: 0.97 };
const NEGATIVO = { pos: 0.01, neg: 0.98, neu: 0.01, compound: -0.97 };
const MISTO = { pos: 0.486, neg: 0.275, neu: 0.238, compound: 0.211 };
const NEUTRO = { pos: 0.2, neg: 0.2, neu: 0.6, compound: 0.0 };

describe('as três dimensões de Fredricks', () => {
  it('cobre os seis itens do questionário, dois por dimensão', () => {
    const itens = DIMENSOES.flatMap((d) => d.itens);
    expect(itens).toHaveLength(6);
    expect(new Set(itens).size).toBe(6);
    DIMENSOES.forEach((d) => expect(d.itens).toHaveLength(2));
  });

  it('usa o ponto neutro da escala como corte, e não um número arbitrário', () => {
    expect(CORTE).toBe(3);
  });

  it('classifica cada dimensão pela média dos seus dois itens', () => {
    const d = avaliarDimensoes(notas(5, 3, 1));
    expect(d.map((x) => x.nivel)).toEqual(['forte', 'intermediaria', 'atencao']);
  });

  it('trata a nota exatamente no corte como intermediária, não como atenção', () => {
    // 3 é "nem concordo nem discordo". Chamar isso de problema seria inventar
    // uma queixa que o aluno não fez.
    expect(avaliarDimensoes(notas(3, 3, 3)).every((d) => d.nivel === 'intermediaria')).toBe(true);
  });

  it('não quebra com feedback incompleto', () => {
    expect(avaliarDimensoes(null)).toEqual([]);
    expect(avaliarDimensoes({})).toEqual([]);
  });
});

describe('frase sobre o comentário', () => {
  it('dá o número e a regra no caso positivo', () => {
    const [primeira] = frasesDoComentario({ ...notas(4, 4, 4), ...POSITIVO });
    expect(primeira).toContain('98% positivo');
    expect(primeira).toContain('passou da metade');
  });

  it('explica o misto sem chamar de positivo', () => {
    const [primeira] = frasesDoComentario({ ...notas(3, 3, 3), ...MISTO });
    expect(primeira).toContain('49% positivo');
    expect(primeira).toContain('28% negativo');
    expect(primeira).toContain('nenhum lado passou da metade');
    expect(primeira).not.toMatch(/resultado ficou \*\*positivo/);
  });

  it('reconhece o neutro sem inventar percentual', () => {
    const [primeira] = frasesDoComentario({ ...notas(3, 3, 3), ...NEUTRO });
    expect(primeira).toContain('neutro');
  });

  it('nomeia as palavras dos dois lados quando existem', () => {
    const fb = {
      ...notas(3, 3, 3), ...MISTO,
      token_attributions: { 'ótimo': 1.0, mas: -0.5, professor: -0.15 },
      shap_attributions: { 'ótimo': 0.5, mas: -0.2, professor: 0.02 },
    };
    const frases = frasesDoComentario(fb);
    expect(frases[1]).toContain('ótimo');
    expect(frases[1]).toContain('mas');
    // "professor" diverge entre as técnicas, então não deve ser citada.
    expect(frases[1]).not.toContain('professor');
  });

  it('não menciona nenhuma técnica ao aluno', () => {
    const fb = { ...notas(4, 4, 4), ...POSITIVO, token_attributions: { boa: 1.0 },
                 shap_attributions: { boa: 0.4 } };
    const texto = frasesDoComentario(fb).join(' ').toLowerCase();
    ['lime', 'shap', 'shapley', 'perturba', 'modelo', 'bert'].forEach((termo) => {
      expect(texto).not.toContain(termo);
    });
  });
});

describe('frase que liga a nota ao comentário', () => {
  it('avisa quando os dois apontam para lados diferentes', () => {
    const alta = fraseDeLigacao({ ...notas(5, 5, 5), ...NEGATIVO });
    expect(alta).toContain('lados diferentes');
    const baixa = fraseDeLigacao({ ...notas(1, 1, 1), ...POSITIVO });
    expect(baixa).toContain('lados diferentes');
  });

  it('quando concordam, apenas separa as origens', () => {
    const f = fraseDeLigacao({ ...notas(5, 5, 5), ...POSITIVO });
    expect(f).not.toContain('lados diferentes');
    expect(f).toContain('perguntas objetivas');
    expect(f).toContain('que você escreveu');
  });

  it('escreve a nota com vírgula decimal', () => {
    expect(fraseDeLigacao({ ...notas(5, 4, 4), ...POSITIVO })).toMatch(/\d,\d de 5/);
  });
});

describe('sugestão', () => {
  it('convida, e não diagnostica', () => {
    const s = sugestao(avaliarDimensoes(notas(5, 5, 1)));
    expect(s).toContain('Se se sentir à vontade');
    // Nada que soe como veredito sobre a pessoa ou como risco.
    ['risco', 'evasão', 'preocupante', 'ruim', 'insuficiente'].forEach((termo) => {
      expect(s.toLowerCase()).not.toContain(termo);
    });
  });

  it('nomeia apenas as dimensões que o próprio aluno marcou baixo', () => {
    const s = sugestao(avaliarDimensoes(notas(5, 5, 1)));
    expect(s).toContain('compreensão do conteúdo');
    expect(s).not.toContain('prazos');
  });

  it('reforça quando está tudo bem, sem inventar problema', () => {
    const s = sugestao(avaliarDimensoes(notas(5, 5, 5)));
    expect(s).toContain('tudo indo bem');
    expect(s).not.toContain('procure o professor');
  });

  it('tem uma frase própria para quando tudo pede atenção', () => {
    const s = sugestao(avaliarDimensoes(notas(1, 1, 1)));
    expect(s).toContain('pesando');
    expect(s).toContain('procure o professor');
  });

  it('não sugere nada quando as notas são intermediárias', () => {
    const s = sugestao(avaliarDimensoes(notas(3, 3, 3)));
    expect(s).not.toContain('procure o professor');
  });
});

describe('devolutiva completa', () => {
  it('monta todas as partes', () => {
    const d = montarDevolutiva({ ...notas(4, 3, 2), ...MISTO,
                                 token_attributions: { boa: 1.0 },
                                 shap_attributions: { boa: 0.4 } });
    expect(d.comentario.length).toBeGreaterThan(0);
    expect(d.ligacao).toBeTruthy();
    expect(d.dimensoes).toHaveLength(3);
    expect(d.sugestao).toBeTruthy();
    expect(d.temExplicacao).toBe(true);
  });

  it('funciona antes de a explicação ficar pronta', () => {
    // O aluno vê a devolutiva das notas assim que envia, mesmo com o cálculo
    // das palavras ainda em curso. Se dependesse dele, a tela ficaria vazia.
    const d = montarDevolutiva({ ...notas(4, 4, 4), ...POSITIVO });
    expect(d.temExplicacao).toBe(false);
    expect(d.dimensoes).toHaveLength(3);
    expect(d.sugestao).toBeTruthy();
    expect(d.comentario.length).toBeGreaterThan(0);
  });

  it('não quebra sem feedback', () => {
    expect(montarDevolutiva(null)).toBeNull();
  });

  it('percorre os quatro rótulos sem erro', () => {
    [POSITIVO, NEGATIVO, MISTO, NEUTRO].forEach((s) => {
      expect(() => montarDevolutiva({ ...notas(3, 3, 3), ...s })).not.toThrow();
    });
  });

  it('cobre as 27 combinações de níveis das três dimensões', () => {
    // Cada dimensão pode cair em três níveis. Se alguma combinação quebrasse,
    // um aluno específico veria a tela falhar e ninguém saberia por quê.
    const valores = [1, 3, 5];
    let combinacoes = 0;
    valores.forEach((a) => valores.forEach((b) => valores.forEach((c) => {
      const d = montarDevolutiva({ ...notas(a, b, c), ...MISTO });
      expect(d.sugestao).toBeTruthy();
      expect(d.ligacao).toBeTruthy();
      combinacoes += 1;
    })));
    expect(combinacoes).toBe(27);
  });
});

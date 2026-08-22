import { rotuloDoFeedback } from './sentiment';
import { atribuicoesConvergentes } from './wordHighlight';

/**
 * Devolutiva textual do feedback, montada por árvore de decisão.
 *
 * Por que existe: a tela mostrava um rótulo, uma nota e palavras coloridas, e
 * cabia ao aluno juntar as três coisas. Pior, a nota e o rótulo vêm de origens
 * diferentes e podem divergir, o que parecia contradição sem nada explicando.
 *
 * Por que árvore de decisão e não texto gerado por modelo: o trabalho inteiro é
 * sobre explicabilidade. Acrescentar um gerador opaco para explicar um
 * classificador opaco seria contraditório. Aqui cada frase é rastreável até a
 * condição que a produziu, e cada caminho é testável.
 *
 * As três dimensões vêm de Fredricks et al. (2004), que é a base do questionário
 * na Seção 3.1.1 do artigo: cada uma é operacionalizada por dois itens. Reportar
 * por dimensão recupera uma estrutura que a média das seis perguntas colapsava.
 */

// Ponto neutro da escala de concordância de cinco pontos. Abaixo dele o aluno
// declarou discordância, o que é fato e não interpretação nossa. Não precisa de
// calibração empírica: é onde a própria escala muda de sinal.
export const CORTE = 3;

export const DIMENSOES = [
  {
    chave: 'comportamental',
    titulo: 'Participação e prazos',
    itens: ['active_participation', 'task_completion'],
    forte: 'você tem participado das aulas e mantido os prazos em dia',
    fraca: 'a sua participação nas aulas e o cumprimento dos prazos',
  },
  {
    chave: 'emocional',
    titulo: 'Motivação e ambiente',
    itens: ['motivation_interest', 'welcoming_environment'],
    forte: 'você tem se sentido motivado e à vontade na disciplina',
    fraca: 'a sua motivação com o conteúdo e o quanto o ambiente te acolhe',
  },
  {
    chave: 'cognitiva',
    titulo: 'Compreensão do conteúdo',
    itens: ['comprehension_effort', 'content_connection'],
    forte: 'você tem conseguido compreender e conectar o conteúdo',
    fraca: 'a sua compreensão do conteúdo e a conexão dele com outras coisas',
  },
];

const media = (valores) => valores.reduce((a, b) => a + b, 0) / valores.length;

export function avaliarDimensoes(feedback) {
  if (!feedback) return [];
  return DIMENSOES.map((d) => {
    const notas = d.itens.map((i) => feedback[i]).filter((n) => typeof n === 'number');
    if (notas.length === 0) return null;
    const valor = media(notas);
    return {
      ...d,
      valor,
      // "atencao" é o único nível que dispara sugestão. Chamar de "ruim" seria
      // juízo sobre o aluno, e o instrumento é de autoavaliação: quem disse foi
      // ele, e o sistema apenas devolve o que ele marcou.
      nivel: valor < CORTE ? 'atencao' : valor >= 4 ? 'forte' : 'intermediaria',
    };
  }).filter(Boolean);
}

/**
 * Existe destaque colorido para o aluno olhar no comentário logo acima?
 *
 * Esta função devolvia as palavras em si, e o texto as listava: "pesaram para o
 * lado positivo incrível, amei e o". Foi retirado por dois motivos.
 *
 * O primeiro é de método. O classificador atribui peso a palavras de função
 * tanto quanto a palavras de conteúdo, e é esperado que atribua: em português o
 * "não" e o "mas" carregam a polaridade da oração inteira. Só que, listadas
 * fora da frase, essas palavras aparecem como se fossem o motivo do resultado,
 * e isso desmente a explicação em vez de sustentá-la. O destaque colorido mostra
 * exatamente as mesmas atribuições sem esse efeito, porque cada palavra continua
 * no lugar onde faz sentido.
 *
 * O segundo é de cuidado. O comentário é sobre a própria experiência do aluno, e
 * a lista devolvia a autocrítica dele recortada e em negrito.
 */
export function temDestaque(feedback) {
  const pesos = atribuicoesConvergentes(feedback?.token_attributions,
                                        feedback?.shap_attributions);
  return !!pesos && Object.keys(pesos).length > 0;
}

const lista = (itens, conector = 'e') => {
  if (itens.length === 0) return '';
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(', ')} ${conector} ${itens[itens.length - 1]}`;
};

const pct = (v) => `${Math.round((v || 0) * 100)}%`;

/**
 * Frase sobre o comentário: o que o modelo respondeu e por quê.
 *
 * Dá o número e a regra, para o aluno poder conferir a conclusão em vez de
 * aceitá-la. Não nomeia técnica nenhuma, coerente com a decisão registrada na
 * Seção 3.5 do artigo de não expor terminologia ao discente.
 */
export function frasesDoComentario(feedback) {
  const rotulo = rotuloDoFeedback(feedback);
  const frases = [];

  if (rotulo === 'positivo') {
    frases.push(`O que você escreveu soou **${pct(feedback.pos)} positivo**. Como esse lado passou da metade, o resultado ficou **positivo**.`);
  } else if (rotulo === 'negativo') {
    frases.push(`O que você escreveu soou **${pct(feedback.neg)} negativo**. Como esse lado passou da metade, o resultado ficou **negativo**.`);
  } else if (rotulo === 'misto') {
    frases.push(`O que você escreveu soou **${pct(feedback.pos)} positivo e ${pct(feedback.neg)} negativo**. Como nenhum lado passou da metade, o resultado ficou **misto**: o seu texto tem os dois.`);
  } else {
    frases.push(`O que você escreveu não pendeu para nenhum lado, então o resultado ficou **neutro**.`);
  }

  if (temDestaque(feedback)) {
    frases.push('As cores no seu comentário logo acima mostram como cada palavra foi percebida: **verde** puxou para o positivo, **vermelho** para o negativo, e quanto mais forte a cor, mais aquela palavra pesou.');
  }

  return frases;
}

/**
 * Frase que liga as duas origens.
 *
 * É o ponto que confundia: a nota vem das seis perguntas, o resultado vem do
 * comentário, e eles medem coisas diferentes. Quando divergem, dizer isso em voz
 * alta é mais honesto do que deixar o aluno achar que o sistema se contradisse.
 */
export function fraseDeLigacao(feedback) {
  const rotulo = rotuloDoFeedback(feedback);
  const nota = (feedback.overall_score * 4 + 1);
  const notaTexto = nota.toFixed(1).replace('.', ',');

  const notaAlta = nota >= 4;
  const notaBaixa = nota < CORTE;
  const textoNegativo = rotulo === 'negativo';
  const textoPositivo = rotulo === 'positivo';

  const base = `Nas seis perguntas você se avaliou em **${notaTexto} de 5**.`;

  if ((notaAlta && textoNegativo) || (notaBaixa && textoPositivo)) {
    return `${base} Isso e o comentário apontam para lados diferentes, e tudo bem: as perguntas são sobre como você se vê na disciplina, o comentário é sobre como você descreveu a aula. Vale reparar nessa diferença.`;
  }
  return `${base} Esse número vem das perguntas objetivas, e o resultado acima vem do que você escreveu.`;
}

/**
 * Camada prescritiva. Convida, não diagnostica.
 *
 * O termo de consentimento promete que o indicador de acompanhamento serve
 * apenas para o professor oferecer apoio e não é comunicado ao aluno. A sugestão
 * aqui não usa esse indicador: ela olha só o que o próprio aluno declarou nas
 * seis perguntas, e devolve isso a ele.
 */
export function sugestao(dimensoes) {
  const atencao = dimensoes.filter((d) => d.nivel === 'atencao');
  const fortes = dimensoes.filter((d) => d.nivel === 'forte');

  if (atencao.length === 0 && fortes.length === dimensoes.length) {
    return 'Está tudo indo bem pela sua própria avaliação. Se quiser manter assim, continue registrando como cada aula foi para você.';
  }

  if (atencao.length === 0) {
    return 'Nada aqui pede atenção urgente. Continue acompanhando, porque é a sequência de registros que mostra se algo está mudando.';
  }

  const pontos = lista(atencao.map((d) => d.fraca));
  if (atencao.length === dimensoes.length) {
    return `Você marcou nota baixa em tudo, e isso costuma ser sinal de que a disciplina está pesando. Se se sentir à vontade, procure o professor para conversar sobre como retomar. Falar cedo costuma ser mais fácil do que parece.`;
  }
  return `Vale olhar com calma para ${pontos}. Se se sentir à vontade, procure o professor para entender como melhorar esses pontos.`;
}

/** Monta a devolutiva inteira. É esta função que a tela chama. */
export function montarDevolutiva(feedback) {
  if (!feedback) return null;
  const dimensoes = avaliarDimensoes(feedback);
  return {
    comentario: frasesDoComentario(feedback),
    ligacao: fraseDeLigacao(feedback),
    dimensoes,
    sugestao: sugestao(dimensoes),
    temExplicacao: temDestaque(feedback),
  };
}

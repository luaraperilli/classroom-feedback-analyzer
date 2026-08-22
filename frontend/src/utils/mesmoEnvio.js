/**
 * O feedback que já está no banco é o mesmo que a pessoa acabou de tentar enviar?
 *
 * Existe por causa do 409. Quando o servidor recusa um envio por já haver
 * feedback daquela disciplina no dia, há dois casos por trás do mesmo código, e
 * eles pedem telas opostas:
 *
 * 1. O envio anterior foi gravado e a resposta se perdeu no caminho. A pessoa
 *    tocou em enviar de novo com o mesmo texto. Aqui o certo é mostrar o
 *    resultado, porque o envio dela deu certo.
 *
 * 2. A pessoa já tinha enviado hoje, mais cedo, e agora escreveu outra coisa. O
 *    texto novo foi recusado e não existe em lugar nenhum. Mostrar o resultado
 *    antigo como confirmação seria agradecer por um texto que foi descartado, e
 *    ela sairia acreditando que enviou.
 *
 * Comparar o conteúdo é o que separa os dois. As seis notas entram na
 * comparação junto do comentário: sem elas, dois envios de comentário vazio
 * pareceriam iguais mesmo com respostas diferentes.
 */

export const ITENS = [
  'active_participation',
  'task_completion',
  'motivation_interest',
  'welcoming_environment',
  'comprehension_effort',
  'content_connection',
];

const texto = (valor) => (valor || '').trim().replace(/\s+/g, ' ').toLowerCase();

export function mesmoEnvio(gravado, enviado) {
  if (!gravado || !enviado) return false;
  if (texto(gravado.additional_comment) !== texto(enviado.additional_comment)) return false;
  return ITENS.every((item) => gravado[item] === enviado[item]);
}

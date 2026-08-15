/**
 * Comparação entre as submissões do aluno, no lugar de uma linha temporal.
 *
 * A coleta acontece em poucos marcos ao longo do semestre. Ligar esses pontos
 * por uma linha afirmaria uma trajetória contínua que não foi medida — e com
 * uma submissão só não há o que interpolar. Aqui cada envio é uma barra com
 * sua data, e a comparação fica entre marcos, não dentro de um intervalo.
 *
 * As barras usam o teal da marca, não o semáforo verde-âmbar-vermelho: esta é a
 * autoavaliação do próprio aluno, e pintar de vermelho a nota que ele mesmo se
 * deu soa como juízo. A hierarquia visual separa o envio mais recente dos
 * anteriores; a leitura de "melhorou ou piorou" fica com a frase, não com a cor.
 */

const ESCALA_MIN = 1;
const ESCALA_MAX = 5;

const TEAL = '#0f766e';
const DIFERENCA_IRRELEVANTE = 0.25;

function paraNota(feedback) {
  // overall_score chega normalizado em 0..1; a tela usa a escala do questionário.
  return feedback.overall_score * 4 + 1;
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function Comparativo({ marcos }) {
  if (marcos.length < 2) return null;

  const diferenca = marcos[marcos.length - 1].nota - marcos[marcos.length - 2].nota;

  if (Math.abs(diferenca) < DIFERENCA_IRRELEVANTE) {
    return (
      <p className="text-sm text-[#64748b] mt-5">
        Sua última avaliação ficou parecida com a anterior.
      </p>
    );
  }

  const subiu = diferenca > 0;
  const modulo = Math.abs(diferenca);

  return (
    <p className={`text-sm mt-5 ${subiu ? 'text-[#0f766e]' : 'text-[#475569]'}`}>
      Sua última avaliação foi {modulo.toFixed(1)} ponto{modulo >= 2 ? 's' : ''}{' '}
      {subiu ? 'maior' : 'menor'} que a anterior.
    </p>
  );
}

function ComparacaoDeMarcos({ feedbacks }) {
  const marcos = feedbacks
    .filter((fb) => fb.overall_score !== null && fb.overall_score !== undefined)
    .map((fb) => ({ id: fb.id, nota: paraNota(fb), data: formatarData(fb.created_at) }));

  if (marcos.length === 0) return null;

  const ultimo = marcos.length - 1;

  return (
    <div>
      <ul className="space-y-3.5">
        {marcos.map((marco, indice) => {
          const proporcao = (marco.nota - ESCALA_MIN) / (ESCALA_MAX - ESCALA_MIN);
          const atual = indice === ultimo;

          return (
            <li key={marco.id} className="flex items-center gap-3">
              <span
                className={`text-sm w-16 flex-shrink-0 tabular-nums ${
                  atual ? 'text-[#1e293b] font-medium' : 'text-[#94a3b8]'
                }`}
              >
                {marco.data}
              </span>

              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(proporcao * 100, 3)}%`,
                    backgroundColor: TEAL,
                    opacity: atual ? 1 : 0.3,
                  }}
                />
              </div>

              <span
                className={`text-sm min-w-[3rem] text-right tabular-nums ${
                  atual ? 'font-semibold text-[#0f766e]' : 'text-[#94a3b8]'
                }`}
              >
                {marco.nota.toFixed(1)}/5
              </span>
            </li>
          );
        })}
      </ul>

      <Comparativo marcos={marcos} />
    </div>
  );
}

export default ComparacaoDeMarcos;

import React, { useState, useEffect } from 'react';

/**
 * Barra de progresso da análise por palavra.
 *
 * Uma espera de três minutos sem sinal de andamento é indistinguível de uma
 * tela travada, e o aluno recarrega ou desiste. A recomendação clássica de IHC
 * é que acima de dez segundos a espera precise de indicador determinado, com
 * início, fim e avanço visível.
 *
 * A estimativa não é decorativa. O LIME faz 5.000 passagens do comentário pelo
 * modelo, e o custo cresce com o tamanho do texto, enquanto o SHAP trabalha com
 * um número fixo de avaliações e custa quase o mesmo sempre. Daí a forma
 * estimativa = base + taxa x caracteres, com os dois valores medidos em
 * produção em 20 de agosto de 2026: 354 caracteres levaram 91,7 segundos de
 * LIME e 17,8 de SHAP, e 389 caracteres levaram 121,0 e 15,8.
 *
 * Os valores anteriores, de 20 segundos mais meio segundo por caractere, vinham
 * de medições feitas antes das otimizações de inferência e previam 197 segundos
 * para um caso que levou 109. A barra ficava na metade e o resultado chegava,
 * o que é tão ruim quanto o contrário: um indicador que erra por muito deixa de
 * ser informação e vira enfeite.
 *
 * A taxa fica um pouco acima do medido de propósito. Instâncias do Cloud Run
 * variam entre si, e é melhor a barra chegar ao fim um pouco antes do previsto
 * do que encostar no teto e ficar esperando.
 *
 * A barra para em 95% enquanto o resultado não chega. Chegar a 100% e continuar
 * esperando destrói a confiança no indicador, e o que sobra é pior do que não
 * ter barra nenhuma.
 */

const BASE = 20;          // segundos, custo praticamente fixo do SHAP
const POR_CARACTERE = 0.30;
const TETO = 95;

export const estimarSegundos = (caracteres) =>
  Math.round(BASE + POR_CARACTERE * (caracteres || 0));

const emPalavras = (segundos) => {
  if (segundos <= 30) return 'menos de meio minuto';
  if (segundos < 90) return 'cerca de um minuto';
  return `cerca de ${Math.round(segundos / 60)} minutos`;
};

export default function ProgressoDaAnalise({ inicio, caracteres }) {
  // Quando o servidor informa o instante em que começou, a contagem parte dele.
  // Isso importa no caso em que outro pedido já estava calculando este mesmo
  // comentário: a barra precisa mostrar o andamento real daquele cálculo, e não
  // recomeçar do zero como se ninguém tivesse trabalhado até aqui.
  const [aberturaDaTela] = useState(() => Date.now());
  const referencia = inicio ? new Date(inicio).getTime() : aberturaDaTela;

  const [decorrido, setDecorrido] = useState(() => Math.max(0, (Date.now() - referencia) / 1000));

  useEffect(() => {
    const relogio = setInterval(() => {
      setDecorrido(Math.max(0, (Date.now() - referencia) / 1000));
    }, 1000);
    return () => clearInterval(relogio);
  }, [referencia]);

  const estimativa = estimarSegundos(caracteres);
  const porcentagem = Math.min(TETO, (decorrido / estimativa) * 100);
  const restante = Math.max(0, estimativa - decorrido);

  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#475569]">
          Analisando quais palavras mais pesaram no resultado...
        </p>
        <span className="text-sm text-[#64748b] tabular-nums shrink-0">
          {Math.round(porcentagem)}%
        </span>
      </div>

      <div
        className="h-2 w-full rounded-full bg-[#e2e8f0] overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(porcentagem)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da análise do comentário"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${porcentagem}%` }}
        />
      </div>

      <p className="text-sm text-[#94a3b8]">
        {restante > 5
          ? `Faltam ${emPalavras(restante)}. O seu feedback já foi registrado, e você pode fechar esta página e voltar depois.`
          : 'Quase lá. O seu feedback já foi registrado, e você pode fechar esta página e voltar depois.'}
      </p>
    </div>
  );
}

import React, { useEffect, useState } from 'react';

/**
 * Espera do envio, que hoje é curta.
 *
 * O modal antes cobria o cálculo inteiro, incluindo LIME e SHAP, e por isso
 * encenava dez etapas ao longo de minutos. Com o processamento em duas etapas,
 * aqui só acontecem a gravação e a análise de sentimento — o destaque por
 * palavra é buscado depois, já na tela de resultado. As etapas foram reduzidas
 * ao que de fato ocorre, para não prometer trabalho que não está sendo feito.
 *
 * O aviso de demora continua existindo por causa do cold start: na primeira
 * submissão do dia o servidor precisa acordar e carregar o modelo.
 */

const ETAPAS = [
  'Enviando as suas respostas…',
  'Lendo o seu comentário…',
  'Analisando o sentimento do texto…',
];

const INTERVALO_ETAPA = 1200;
const SEGUNDOS_ATE_AVISO = 15;

export default function AnalyzingModal() {
  const [etapa, setEtapa] = useState(0);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const passo = setInterval(
      () => setEtapa((v) => (v < ETAPAS.length - 1 ? v + 1 : v)),
      INTERVALO_ETAPA
    );
    const relogio = setInterval(() => setSegundos((s) => s + 1), 1000);

    return () => {
      clearInterval(passo);
      clearInterval(relogio);
    };
  }, []);

  const demorando = segundos >= SEGUNDOS_ATE_AVISO;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a4f49]/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <span className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping" />
          <span className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary animate-pulse" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8.5 13v-1.5M12 13v-3.5M15.5 13v-5.5" />
            </svg>
          </span>
        </div>

        <h3 className="text-base font-semibold text-[#1e293b]">Enviando o seu feedback</h3>

        <p key={etapa} className="animate-step text-sm text-[#475569] mt-2 min-h-[20px]">
          {ETAPAS[etapa]}
        </p>

        <div className="mt-5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full animate-indeterminate" />
        </div>

        <p className="text-sm text-[#94a3b8] mt-4 leading-snug">
          {demorando
            ? `Está levando um pouco mais que o normal (${segundos}s). Pode aguardar, o seu envio está a caminho.`
            : 'Leva alguns segundos.'}
        </p>
      </div>
    </div>
  );
}

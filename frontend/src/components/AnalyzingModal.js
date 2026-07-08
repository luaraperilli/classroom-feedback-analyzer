import React, { useEffect, useState } from 'react';

// Etapas exibidas em sequência enquanto o backend processa
// (pysentimiento + LIME + SHAP). Mensagens honestas com o que está acontecendo,
// em tom amigável, para engajar o aluno durante a espera.
const STEPS = [
  'Lendo o seu comentário…',
  'Entendendo o contexto da sua aula…',
  'Pensando sobre o que você escreveu…',
  'Analisando o sentimento do texto…',
  'Comparando com milhares de exemplos…',
  'Identificando as palavras que mais pesaram…',
  'Medindo a influência de cada palavra…',
  'Cruzando com a sua avaliação geral…',
  'Organizando os destaques do seu texto…',
  'Quase lá — montando o seu resultado…',
];

export default function AnalyzingModal() {
  const [i, setI] = useState(0);

  useEffect(() => {
    // avança as etapas; segura na última até o resultado chegar
    const id = setInterval(() => {
      setI((v) => (v < STEPS.length - 1 ? v + 1 : v));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const step = STEPS[i];

  return (
    <div className="fixed inset-0 z-50 bg-[#0a4f49]/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        {/* Ícone pulsante da marca */}
        <div className="relative w-16 h-16 mx-auto mb-5">
          <span className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping" />
          <span className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary animate-pulse" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8.5 13v-1.5M12 13v-3.5M15.5 13v-5.5" />
            </svg>
          </span>
        </div>

        <h3 className="text-base font-semibold text-[#1e293b]">Analisando o seu feedback</h3>

        {/* Mensagem da etapa atual — refaz a animação a cada troca (key) */}
        <p key={i} className="animate-step text-sm text-[#475569] mt-2 min-h-[20px]">{step}</p>

        {/* Barra de progresso indeterminada */}
        <div className="mt-5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full animate-indeterminate" />
        </div>

        {/* Indicadores de etapa */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= i ? 'w-5 bg-primary' : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <p className="text-sm text-[#94a3b8] mt-4">Isso pode levar alguns segundos — não feche a página.</p>
      </div>
    </div>
  );
}

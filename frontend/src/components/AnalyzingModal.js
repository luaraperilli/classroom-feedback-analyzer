import React, { useEffect, useState } from 'react';

// Etapas exibidas enquanto o backend processa (pysentimiento + LIME + SHAP).
const ETAPAS = [
  'Lendo o seu comentário…',
  'Entendendo o contexto da sua aula…',
  'Pensando sobre o que você escreveu…',
  'Analisando o sentimento do texto…',
  'Comparando com milhares de exemplos…',
  'Identificando as palavras que mais pesaram…',
  'Medindo a influência de cada palavra…',
  'Cruzando com a sua avaliação geral…',
  'Organizando os destaques do seu texto…',
  'Montando o seu resultado…',
];

// Depois das etapas, a espera continua. Antes o modal congelava em "Quase lá"
// e o aluno ficava sem saber se o sistema tinha travado; agora ele passa a
// contar o tempo e a avisar que está demorando mais do que o normal.
const SEGUNDOS_ATE_AVISO = 45;
const INTERVALO_ETAPA = 2600;

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
  const terminouEtapas = etapa === ETAPAS.length - 1;

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

        <h3 className="text-base font-semibold text-[#1e293b]">Analisando o seu feedback</h3>

        <p key={etapa} className="animate-step text-sm text-[#475569] mt-2 min-h-[20px]">
          {demorando ? 'Ainda processando — falta pouco…' : ETAPAS[etapa]}
        </p>

        <div className="mt-5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full animate-indeterminate" />
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-4">
          {ETAPAS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= etapa ? 'w-5 bg-primary' : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {demorando ? (
          <p className="text-sm text-amber-600 mt-4 leading-snug">
            Está demorando mais que o normal ({segundos}s). A análise continua rodando —
            é só não fechar a página.
          </p>
        ) : (
          <p className="text-sm text-[#94a3b8] mt-4">
            {terminouEtapas
              ? `Processando há ${segundos}s — não feche a página.`
              : 'Isso pode levar alguns segundos — não feche a página.'}
          </p>
        )}
      </div>
    </div>
  );
}

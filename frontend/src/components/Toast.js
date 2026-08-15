import React, { useEffect, useState } from 'react';

// Confirmação temporária, que aparece no topo e some sozinha. Antes a mensagem
// de "feedback enviado" ficava fixa na tela junto do resultado.
function Toast({ mensagem, duracao = 4000, onFechar }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const entrada = requestAnimationFrame(() => setVisivel(true));
    const saida = setTimeout(() => setVisivel(false), duracao);
    const remocao = setTimeout(() => onFechar?.(), duracao + 300);

    return () => {
      cancelAnimationFrame(entrada);
      clearTimeout(saida);
      clearTimeout(remocao);
    };
  }, [duracao, onFechar]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-[calc(100%-2rem)] max-w-sm
                  transition-all duration-300 ease-out
                  ${visivel ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
    >
      <div className="flex items-center gap-2.5 rounded-xl bg-primary text-white px-4 py-3 shadow-[0_12px_28px_rgba(13,98,92,0.28)]">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium">{mensagem}</span>
      </div>
    </div>
  );
}

export default Toast;

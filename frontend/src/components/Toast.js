import React, { useEffect, useState } from 'react';

// Confirmação temporária, que aparece no topo e some sozinha. Antes a mensagem
// de "feedback enviado" ficava fixa na tela junto do resultado.
//
// A centralização é sobre a área de conteúdo, não sobre a janela: a partir de
// lg a barra lateral ocupa w-60 (15rem), e centralizar na viewport deixava o
// toast visivelmente deslocado para a esquerda.
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
      className={`fixed top-5 left-1/2 lg:left-[calc(50%+7.5rem)] -translate-x-1/2 z-50
                  w-max max-w-[calc(100vw-2rem)]
                  transition-all duration-300 ease-out
                  ${visivel ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}`}
    >
      {/* Fundo branco, e não o teal da marca: o toast nasce sobre o cabeçalho
          teal da tela de histórico, onde teal sobre teal sumia. */}
      <div className="flex items-center gap-2.5 rounded-full bg-white border border-[#cfe0da] pl-3 pr-4 py-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
        <svg className="w-5 h-5 flex-shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium text-[#1e293b] whitespace-nowrap">{mensagem}</span>
      </div>
    </div>
  );
}

export default Toast;

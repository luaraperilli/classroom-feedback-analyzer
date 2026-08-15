import React, { useState } from 'react';

// Substitui o atributo title= nativo, que só aparece depois de quase um segundo
// e usa o visual do sistema operacional. Aqui o atraso é de 120 ms e o estilo
// acompanha o resto da interface.
function Tooltip({ texto, children, posicao = 'top', className = '' }) {
  const [visivel, setVisivel] = useState(false);

  const posicoes = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const setas = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1',
  };

  const mostrar = () => setVisivel(true);
  const esconder = () => setVisivel(false);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={mostrar}
      onMouseLeave={esconder}
      onFocus={mostrar}
      onBlur={esconder}
      onTouchStart={() => setVisivel((v) => !v)}
    >
      {children}

      <span
        role="tooltip"
        className={`absolute z-50 w-max max-w-[16rem] px-3 py-2 rounded-xl
                    bg-[#0f172a] text-white text-sm font-normal leading-snug text-left
                    shadow-[0_8px_24px_rgba(15,23,42,0.28)]
                    transition-all duration-150 ease-out
                    ${posicoes[posicao]}
                    ${visivel ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        {texto}
        <span className={`absolute w-2 h-2 rotate-45 bg-[#0f172a] ${setas[posicao]}`} />
      </span>
    </span>
  );
}

export default Tooltip;

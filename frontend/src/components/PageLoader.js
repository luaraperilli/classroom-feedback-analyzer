import React from 'react';
import Spinner from './Spinner';

// Tela de carregamento de página inteira, com a identidade do produto.
export default function PageLoader({ label = 'Carregando...' }) {
  return (
    <div className="min-h-screen bg-[#cde0d9] flex flex-col items-center justify-center gap-3">
      <Spinner className="w-8 h-8 text-primary" />
      <p className="text-sm text-[#475569]">{label}</p>
    </div>
  );
}

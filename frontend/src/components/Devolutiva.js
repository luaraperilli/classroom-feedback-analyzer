import React from 'react';
import { montarDevolutiva } from '../utils/devolutiva';
import { numeroPtBr } from '../utils/numeroPtBr';

/**
 * Devolutiva em texto, no lugar de três números soltos.
 *
 * O negrito marca só o que o aluno precisa levar embora: o resultado, os
 * percentuais e as palavras que pesaram. Marcar mais do que isso equivale a não
 * marcar nada.
 *
 * Sem emoji. A identidade do sistema é sóbria, e leitor de tela verbaliza o nome
 * de cada um no meio da frase.
 */

const NIVEIS = {
  forte: { rotulo: 'Vai bem', cor: '#0f766e', trilho: 'bg-[#0f766e]' },
  intermediaria: { rotulo: 'No meio', cor: '#64748b', trilho: 'bg-[#64748b]' },
  atencao: { rotulo: 'Merece atenção', cor: '#b45309', trilho: 'bg-[#b45309]' },
};

/** Converte **isto** em negrito. Deliberadamente mínimo: só isso é suportado. */
function ComNegrito({ texto }) {
  return (
    <>
      {texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
        parte.startsWith('**') && parte.endsWith('**')
          ? <strong key={i} className="font-semibold text-[#1e293b]">{parte.slice(2, -2)}</strong>
          : <React.Fragment key={i}>{parte}</React.Fragment>
      )}
    </>
  );
}

function Dimensao({ dimensao }) {
  const meta = NIVEIS[dimensao.nivel];
  const largura = Math.max(0, Math.min(100, ((dimensao.valor - 1) / 4) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[#1e293b] w-44 shrink-0">{dimensao.titulo}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full rounded-full ${meta.trilho}`} style={{ width: `${largura}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums w-10 text-right" style={{ color: meta.cor }}>
        {numeroPtBr(dimensao.valor, 1)}
      </span>
      <span className="text-sm w-32 shrink-0" style={{ color: meta.cor }}>
        {meta.rotulo}
      </span>
    </div>
  );
}

export default function Devolutiva({ feedback }) {
  const d = montarDevolutiva(feedback);
  if (!d) return null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#cfe0da] bg-bg px-4 py-3 space-y-2">
        <h4 className="text-sm font-semibold text-[#1e293b]">O que você escreveu</h4>
        {d.comentario.map((frase, i) => (
          <p key={i} className="text-sm text-[#475569] leading-relaxed">
            <ComNegrito texto={frase} />
          </p>
        ))}
        {!d.temExplicacao && (
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            As palavras que mais pesaram aparecem aqui assim que a análise ficar pronta.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[#cfe0da] bg-bg px-4 py-3 space-y-3">
        <h4 className="text-sm font-semibold text-[#1e293b]">O que você respondeu</h4>
        <div className="space-y-2.5">
          {d.dimensoes.map((dim) => <Dimensao key={dim.chave} dimensao={dim} />)}
        </div>
        <p className="text-sm text-[#475569] leading-relaxed pt-1">
          <ComNegrito texto={d.ligacao} />
        </p>
      </section>

      <section className="rounded-xl border border-[#cfe0da] bg-white px-4 py-3">
        <h4 className="text-sm font-semibold text-[#1e293b] mb-1">Uma sugestão</h4>
        <p className="text-sm text-[#475569] leading-relaxed">{d.sugestao}</p>
      </section>
    </div>
  );
}

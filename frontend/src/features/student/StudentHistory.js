import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getMyFeedbacks, getSubjects, deleteMyFeedback, gerarExplicacao } from '../../services/api';
import { getSentimentLabel } from '../../utils/sentiment';
import { translateSubject } from '../../utils/translations';
import { tokenizeAndScore, temAtribuicoes, atribuicoesConvergentes } from '../../utils/wordHighlight';
import { numeroPtBr, numeroComSinal } from '../../utils/numeroPtBr';
import Tooltip from '../../components/Tooltip';
import ComparacaoDeMarcos from '../../components/ComparacaoDeMarcos';
import ProgressoDaAnalise from '../../components/ProgressoDaAnalise';
import Spinner from '../../components/Spinner';
import Toast from '../../components/Toast';

// Acompanhamento do cálculo da explicação. Dez segundos entre consultas é curto
// o bastante para o destaque aparecer logo depois de pronto e leve o bastante
// para não pesar: cada consulta é uma leitura, não um cálculo. O teto de sessenta
// tentativas dá dez minutos, bem acima dos quatro minutos do pior caso medido,
// para que a desistência só aconteça quando algo realmente deu errado.
const INTERVALO_DE_CONSULTA = 10000;
const MAXIMO_DE_CONSULTAS = 60;

const SENTIMENT_META = {
  positivo: { label: 'Positivo', color: '#0f766e', bg: 'bg-[#e6f2f1]', ring: 'ring-[#c5e0dd]', text: 'text-[#0f766e]', dot: 'bg-[#0f766e]' },
  neutro:   { label: 'Neutro',   color: '#64748b', bg: 'bg-slate-50', ring: 'ring-slate-200', text: 'text-[#64748b]', dot: 'bg-[#64748b]' },
  negativo: { label: 'Negativo', color: '#dc2626', bg: 'bg-red-50',   ring: 'ring-red-200',   text: 'text-[#dc2626]', dot: 'bg-[#dc2626]' },
};


function HighlightedText({ text, tokenAttributions }) {
  const tokens = tokenizeAndScore(text, tokenAttributions || null);
  return (
    <span className="leading-relaxed">
      {tokens.map(({ token, style }, i) =>
        style
          ? <mark key={i} style={{ ...style, backgroundColor: style.backgroundColor }} className="bg-transparent rounded-sm">{token}</mark>
          : <span key={i}>{token}</span>
      )}
    </span>
  );
}

function ExplainabilityModal({ onClose }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div ref={ref} className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[#1e293b]">Como lemos o seu comentário</h3>
        </div>
        <p className="text-sm text-[#475569] leading-relaxed">
          Para te ajudar a refletir, destacamos as palavras do seu comentário que mais pesaram na forma como ele foi percebido.
        </p>
        <div className="bg-bg rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: 'rgba(15,118,110,0.35)' }} />
            <span className="text-[#475569]"><span className="font-medium text-[#0f766e]">Verde</span> — puxou o resultado para o lado positivo</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: 'rgba(220,38,38,0.35)' }} />
            <span className="text-[#475569]"><span className="font-medium text-[#dc2626]">Vermelho</span> — puxou para o lado negativo</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#475569]">Quanto <span className="font-medium text-[#1e293b]">mais forte a cor</span>, mais aquela palavra influenciou o resultado.</span>
          </div>
        </div>
        <p className="text-sm text-[#64748b] leading-relaxed">
          O destaque é gerado automaticamente a partir do seu texto e serve para você enxergar como a sua escrita reflete a sua experiência com a disciplina.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

function ExplainabilityLegend({ onInfo }) {
  return (
    <div className="flex items-center gap-6 flex-wrap mt-2">
      <span className="text-sm font-medium text-[#475569]">O que mais pesou no resultado:</span>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-sm text-[#475569]">
          <span className="w-14 h-3 rounded-sm inline-block" style={{
            background: 'linear-gradient(to right, rgba(15,118,110,0.08), rgba(15,118,110,0.5))'
          }} />
          Positivo
        </span>
        <span className="flex items-center gap-1.5 text-sm text-[#475569]">
          <span className="w-14 h-3 rounded-sm inline-block" style={{
            background: 'linear-gradient(to right, rgba(220,38,38,0.08), rgba(220,38,38,0.5))'
          }} />
          Negativo
        </span>
      </div>
      <button
        onClick={onInfo}
        className="ml-auto flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
        </svg>
        Como funciona?
      </button>
    </div>
  );
}

function SentimentBadge({ compound, showScore }) {
  const label = getSentimentLabel(compound);
  const meta = SENTIMENT_META[label];
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ring-1 ${meta.bg} ${meta.ring} ${meta.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      {showScore && compound !== null && compound !== undefined && (
        <span className="text-sm font-mono text-[#64748b]">
          {numeroComSinal(compound, 2)}
        </span>
      )}
    </div>
  );
}

function ScoreBar({ score }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.6 ? '#0f766e' : score >= 0.4 ? '#f59e0b' : '#dc2626';
  const display = numeroPtBr(score * 4 + 1, 1);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <Tooltip texto="Média das suas respostas às seis perguntas, na mesma escala de 1 a 5 do questionário.">
        <span className="text-sm font-semibold min-w-[3rem] text-right cursor-help" style={{ color }}>
          {display}/5
        </span>
      </Tooltip>
    </div>
  );
}

function SentimentFace({ label, className }) {
  const mouth = {
    positivo: 'M8.5 14.5a4.5 4.5 0 0 0 7 0',
    neutro:   'M8.5 14.75h7',
    negativo: 'M15.5 15.5a4.5 4.5 0 0 0-7 0',
  }[label] || 'M8.5 14.75h7';
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.25" />
      <path strokeLinecap="round" d="M9 10h.01M15 10h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d={mouth} />
    </svg>
  );
}

function StatCard({ icon, tint, value, valueClass, label, hint }) {
  return (
    <div className="relative bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_12px_28px_rgba(13,98,92,0.10)] p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5">
      {hint && (
        // O wrapper externo posiciona; o Tooltip aplica `relative` em si mesmo
        // e anularia um `absolute` passado por className.
        <span className="absolute top-3 right-3">
          <Tooltip texto={hint} posicao="left">
            <span
              aria-label={hint}
              className="text-[#94a3b8] hover:text-primary cursor-help transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
              </svg>
            </span>
          </Tooltip>
        </span>
      )}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold leading-none ${valueClass || 'text-[#0f172a]'}`}>{value}</p>
        <p className="text-sm text-[#475569] mt-1.5">{label}</p>
      </div>
    </div>
  );
}

function SummaryCard({ feedbacks }) {
  if (!feedbacks.length) return null;

  const withSentiment = feedbacks.filter((f) => f.compound !== null && f.compound !== undefined);
  const avgCompound = withSentiment.length
    ? withSentiment.reduce((a, b) => a + b.compound, 0) / withSentiment.length
    : null;
  const avgLabel = avgCompound !== null ? getSentimentLabel(avgCompound) : null;
  const avgMeta  = avgLabel ? SENTIMENT_META[avgLabel] : null;
  const avgScore = feedbacks.reduce((a, b) => a + b.overall_score, 0) / feedbacks.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        tint="bg-slate-100"
        valueClass="text-primary"
        value={feedbacks.length}
        label="Feedbacks enviados"
        hint="Total de feedbacks que você já enviou (contando todas as disciplinas exibidas)."
        icon={
          <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 8.5h8M8 12h5" />
          </svg>
        }
      />
      <StatCard
        tint="bg-sky-50"
        valueClass={avgMeta ? avgMeta.text : 'text-[#64748b]'}
        value={avgMeta ? avgMeta.label : '--'}
        label="Sentimento médio"
        hint="Sentimento predominante calculado pela IA a partir dos comentários que você escreveu."
        icon={
          <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.5h.01M15 9.5h.01" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14.5c.9 1 2.1 1.5 3.5 1.5s2.6-.5 3.5-1.5" />
          </svg>
        }
      />
      <StatCard
        tint="bg-amber-50"
        valueClass="text-[#0f172a]"
        value={numeroPtBr(avgScore * 4 + 1, 1)}
        label="Nota média"
        hint="Média das suas avaliações gerais da aula, na escala de 1 a 5 (a partir das perguntas objetivas que você respondeu)."
        icon={
          <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 9.771c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        }
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-2xl border border-[#cfe0da] p-4 animate-pulse">
            <div className="h-7 bg-slate-100 rounded-lg w-12 mx-auto mb-2" />
            <div className="h-3 bg-slate-100 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
      <div className="bg-surface rounded-2xl border border-[#cfe0da] p-6 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/4" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface rounded-2xl border border-[#cfe0da] p-4 animate-pulse flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-32" />
            <div className="h-3 bg-slate-100 rounded w-20" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// Quantos feedbacks já têm sentimento calculado. Usado para decidir se dá para mostrar
// a evolução — de forma agnóstica ao ritmo do professor (por marco, semanal, mensal…),
// já que cada disciplina define seu próprio ritmo de coleta.
function countPointsWithData(feedbacks) {
  return feedbacks.filter((fb) => fb.overall_score !== null && fb.overall_score !== undefined).length;
}

function FeedbackCard({ fb, defaultOpen, onInfo, onRequestDelete }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const label = getSentimentLabel(fb.compound);
  const meta  = SENTIMENT_META[label];
  const date  = new Date(fb.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const attributions = atribuicoesConvergentes(fb.token_attributions, fb.shap_attributions);

  return (
    <div
      className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_12px_28px_rgba(13,98,92,0.11)] overflow-hidden transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.11)]"
      style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}
    >
      <div className="w-full flex items-center justify-between gap-3 px-5 py-4">
        <button
          className="flex items-center gap-3 flex-wrap flex-1 text-left min-w-0"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ${meta.bg} ${meta.ring}`}>
            <SentimentFace label={label} className={`w-5 h-5 ${meta.text}`} />
          </span>
          <span className="text-sm font-semibold text-[#1e293b]">{translateSubject(fb.subject)}</span>
          <SentimentBadge compound={fb.compound} />
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm text-[#64748b] mr-1 hidden sm:inline">{date}</span>
          <button
            onClick={() => onRequestDelete(fb.id)}
            aria-label="Apagar este feedback"
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#dc2626] hover:bg-red-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Recolher' : 'Expandir'}
            className="p-1 text-[#64748b]"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '900px' : '0px', opacity: expanded ? 1 : 0 }}
      >
        <div className="px-5 pb-5 space-y-4 border-t border-slate-50 pt-4">
          {fb.additional_comment && (
            <div className="rounded-2xl bg-gradient-to-br from-primary/[0.05] to-transparent border border-primary/10 p-4">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Como suas palavras foram percebidas</p>
              <blockquote className="text-sm text-[#1e293b] leading-relaxed bg-white rounded-xl px-4 py-3 border border-[#cfe0da]">
                <HighlightedText text={fb.additional_comment} tokenAttributions={attributions} />
              </blockquote>
              {temAtribuicoes(attributions) ? (
                <ExplainabilityLegend onInfo={onInfo} />
              ) : (
                <p className="text-sm text-[#64748b] mt-3">
                  A explicação deste comentário não está disponível.
                </p>
              )}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-[#64748b] uppercase tracking-wide mb-2">Avaliação Geral da Aula</p>
            <ScoreBar score={fb.overall_score} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentHistory() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { accessToken, user } = useAuth();

  const [feedbacks, setFeedbacks]             = useState([]);
  const [subjects, setSubjects]               = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isLoading, setIsLoading]             = useState(true);
  const [error, setError]                     = useState(null);
  const [showModal, setShowModal]             = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleting, setIsDeleting]           = useState(false);
  const [erroExclusao, setErroExclusao]       = useState(null);

  // O resultado do envio é consumido uma vez e some do histórico do navegador.
  // Enquanto vivia só no state da rota, um F5 restaurava a entrada e a tela
  // reexibia o resultado de um envio já encerrado, como se fosse novo.
  const [recemEnviado, setRecemEnviado] = useState(state?.latest ?? null);
  const [mostrarToast, setMostrarToast] = useState(!!state?.latest);

  const [explicando, setExplicando] = useState(false);
  // Trava local: um feedback é explicado uma vez por sessão, aconteça o que
  // acontecer com o resultado. Sem isso, um cálculo que não rendesse palavra
  // nenhuma deixaria a condição de saída sempre falsa e o efeito se repetiria
  // indefinidamente, cada repetição custando minutos de servidor.
  const explicacoesTentadas = useRef(new Set());
  const [erroExplicacao, setErroExplicacao] = useState(null);
  const [inicioDaAnalise, setInicioDaAnalise] = useState(null);

  useEffect(() => {
    if (state?.latest) navigate('/historico', { replace: true, state: null });
  }, [state?.latest, navigate]);

  // Nova tentativa a pedido do aluno. Limpa a trava para este feedback, já que
  // agora quem decide repetir é ele, e não o efeito.
  const tentarExplicarDeNovo = () => {
    if (!recemEnviado) return;
    explicacoesTentadas.current.delete(recemEnviado.id);
    setErroExplicacao(null);
    setRecemEnviado({ ...recemEnviado });
  };

  // Segunda etapa do envio: o feedback já está salvo e o aluno já vê a nota e o
  // sentimento; aqui buscamos o destaque por palavra, que é a parte cara. Ele
  // permanece na tela enquanto isso, então a explicação chega a tempo de servir
  // à reflexão — que é o ponto do trabalho.
  useEffect(() => {
    if (!recemEnviado || !accessToken) return;
    if (!(recemEnviado.additional_comment || '').trim()) return;
    if (temAtribuicoes(recemEnviado.token_attributions || recemEnviado.shap_attributions)) return;
    if (explicacoesTentadas.current.has(recemEnviado.id)) return;

    explicacoesTentadas.current.add(recemEnviado.id);

    const id = recemEnviado.id;
    let cancelado = false;
    let relogio = null;

    setExplicando(true);
    setErroExplicacao(null);

    const registrar = (atualizado) => {
      setRecemEnviado(atualizado);
      setFeedbacks((anteriores) =>
        anteriores.map((fb) => (fb.id === atualizado.id ? atualizado : fb))
      );
    };

    // Consulta o resultado de tempos em tempos, em vez de manter uma requisição
    // aberta por minutos à espera da resposta.
    //
    // No celular, uma espera longa quase nunca chega ao fim: bloquear a tela ou
    // trocar de aplicativo suspende a requisição, e o aluno via erro embora o
    // servidor tivesse concluído. Consultando, o cálculo continua do lado do
    // servidor e a tela apenas pergunta se já terminou, o que sobrevive a queda
    // de conexão e a recarregamento da página.
    const consultar = async (tentativa) => {
      if (cancelado) return;

      if (tentativa > MAXIMO_DE_CONSULTAS) {
        setErroExplicacao('A análise demorou mais que o esperado.');
        setExplicando(false);
        return;
      }

      try {
        // A assinatura é (subject_id, token). Passar só o token colocava o JWT
        // no lugar do filtro de disciplina, e o servidor tentava comparar um
        // inteiro com aquela string, o que derrubava toda consulta. A
        // recuperação que eu tinha acrescentado nunca chegou a funcionar.
        const lista = await getMyFeedbacks(null, accessToken);
        if (cancelado) return;

        const atual = lista.find((fb) => fb.id === id);
        if (atual && temAtribuicoes(atual.token_attributions || atual.shap_attributions)) {
          registrar(atual);
          setExplicando(false);
          return;
        }
      } catch (erro) {
        // Falha de rede numa consulta não é motivo para desistir: a próxima
        // tentativa acontece de qualquer forma, e o cálculo segue no servidor.
        console.error('[Voz Discente] falha ao consultar a explicação:', erro);
      }

      relogio = setTimeout(() => consultar(tentativa + 1), INTERVALO_DE_CONSULTA);
    };

    gerarExplicacao(id, accessToken)
      .then((resposta) => {
        if (cancelado) return;

        // O servidor avisa quando outro pedido já está calculando este mesmo
        // feedback. Nesse caso não há resultado ainda, e só resta acompanhar.
        if (resposta?.explicacao_em_processamento) {
          // Guardado à parte, e não em recemEnviado, porque alterar recemEnviado
          // reexecutaria este efeito e a trava por id o encerraria antes de
          // retomar a consulta, deixando a tela esperando para sempre.
          setInicioDaAnalise(resposta.explicacao_iniciada_em || null);
          consultar(1);
          return;
        }

        registrar(resposta);
        setExplicando(false);
      })
      .catch((erro) => {
        if (cancelado) return;
        console.error('[Voz Discente] falha ao gerar a explicação:', erro);

        // Perder a resposta não significa que o cálculo falhou. O servidor
        // costuma concluir e gravar mesmo quando a conexão do celular cai no
        // meio, então vale acompanhar antes de declarar erro ao aluno.
        consultar(1);
      });

    return () => {
      cancelado = true;
      if (relogio) clearTimeout(relogio);
    };
  }, [recemEnviado, accessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    getSubjects(accessToken)
      .then((data) => { if (!cancelled) setSubjects(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    setIsLoading(true);
    getMyFeedbacks(selectedSubject || null, accessToken)
      .then((data) => { if (!cancelled) setFeedbacks(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Erro ao carregar histórico.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, selectedSubject]);

  // Ao chegar nesta tela (em especial logo após enviar um feedback), joga o foco
  // para o topo — assim a confirmação "enviado com sucesso" é a primeira coisa que a pessoa vê.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [recemEnviado]);

  const latestFeedback  = recemEnviado ?? (feedbacks.length > 0 ? feedbacks[feedbacks.length - 1] : null);

  // O envio recém-feito já aparece inteiro no cartão de resultado, no topo.
  // Repeti-lo no histórico logo abaixo mostrava o mesmo comentário duas vezes,
  // e a segunda ainda dizia "explicação indisponível" enquanto a primeira
  // estava calculando — duas versões do mesmo feedback se contradizendo.
  const historico = [...feedbacks]
    .reverse()
    .filter((fb) => fb.id !== recemEnviado?.id);
  const pointsWithData  = countPointsWithData(feedbacks);

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.display_name || user?.username;

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteMyFeedback(confirmDeleteId, accessToken);
      setFeedbacks((prev) => prev.filter((f) => f.id !== confirmDeleteId));
      // se o apagado for o feedback recém-enviado (mostrado no topo), remove o banner
      if (recemEnviado?.id === confirmDeleteId) {
        setRecemEnviado(null);
      }
      setConfirmDeleteId(null);
    } catch (err) {
      // Erro de exclusão não pode usar o mesmo estado do erro de carregamento:
      // todo o conteúdo da tela fica sob `!error` e sumia junto.
      setErroExclusao(err.message || 'Não foi possível apagar o feedback.');
      setConfirmDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#cde0d9]">
      {showModal && <ExplainabilityModal onClose={() => setShowModal(false)} />}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#dc2626]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#1e293b]">Apagar este feedback?</h3>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed">
              Essa ação não pode ser desfeita. Depois de apagar, você poderá enviar um novo feedback para essa disciplina.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-[#475569] hover:bg-bg transition disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-[#dc2626] text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {isDeleting ? (<><Spinner /> Apagando…</>) : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-[0_14px_30px_rgba(13,98,92,0.18)]">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Minhas Avaliações</h1>
              <p className="text-white/80 text-sm mt-1.5">Olá, {displayName} — acompanhe as análises dos seus feedbacks.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="subject-filter" className="text-sm text-white/80">Disciplina:</label>
              <select
                id="subject-filter"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-white/25 text-sm text-white bg-white/15
                           focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer [&>option]:text-[#1e293b]"
              >
                <option value="">Todas</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{translateSubject(s.name)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {mostrarToast && (
          <Toast mensagem="Feedback enviado com sucesso!" onFechar={() => setMostrarToast(false)} />
        )}

        {erroExclusao && (
          <div role="alert" className="flex items-start gap-3 text-sm text-[#dc2626] bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="flex-1 font-medium">{erroExclusao}</span>
            <button onClick={() => setErroExclusao(null)} aria-label="Fechar aviso" className="text-[#dc2626]/60 hover:text-[#dc2626]">
              ✕
            </button>
          </div>
        )}

        {/* Resultado do feedback recém-enviado — fica no topo para ser a primeira coisa vista */}
        {recemEnviado && (
          <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_14px_30px_rgba(13,98,92,0.12)] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#0f172a]">
                <span className="w-1 h-5 rounded-full bg-primary" />
                Resultado do Feedback
              </h2>
              <SentimentBadge compound={latestFeedback.compound} />
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary/[0.05] to-transparent border border-primary/10 p-4">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Como suas palavras foram percebidas</p>
              <blockquote className="text-sm text-[#1e293b] leading-relaxed bg-white rounded-xl px-4 py-3 border border-[#cfe0da]">
                {/* A chave muda quando o destaque chega, forçando o React a
                    trocar a subárvore inteira em vez de remendá-la palavra a
                    palavra. Reduz a chance de conflito com extensões que
                    reescrevem o texto da página, como tradutores. */}
                <HighlightedText
                  key={temAtribuicoes(latestFeedback.token_attributions || latestFeedback.shap_attributions)
                    ? 'com-destaque' : 'sem-destaque'}
                  text={latestFeedback.additional_comment}
                  tokenAttributions={atribuicoesConvergentes(
                    latestFeedback.token_attributions,
                    latestFeedback.shap_attributions,
                  )}
                />
              </blockquote>
              {temAtribuicoes(latestFeedback.token_attributions || latestFeedback.shap_attributions) ? (
                <ExplainabilityLegend onInfo={() => setShowModal(true)} />
              ) : explicando ? (
                <ProgressoDaAnalise
                  inicio={inicioDaAnalise || latestFeedback.explicacao_iniciada_em}
                  caracteres={(latestFeedback.additional_comment || '').length}
                />
              ) : erroExplicacao ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-[#475569]">
                    {erroExplicacao} O seu feedback está salvo — só o destaque das
                    palavras não pôde ser gerado agora.
                  </p>
                  <button
                    onClick={tentarExplicarDeNovo}
                    className="text-sm font-semibold text-primary hover:text-primary-dark transition"
                  >
                    Tentar de novo
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#64748b] mt-3">
                  A explicação deste comentário não está disponível.
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748b] uppercase tracking-wide mb-2">Avaliação Geral da Aula</p>
              <ScoreBar score={latestFeedback.overall_score} />
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-[#475569]
                         hover:bg-bg transition font-medium"
            >
              Avaliar Novamente
            </button>
          </div>
        )}

        {isLoading && <Skeleton />}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && feedbacks.length === 0 && (
          <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_14px_30px_rgba(13,98,92,0.12)] p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-[#475569] mb-4 font-medium">Você ainda não enviou nenhum feedback.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition"
            >
              Enviar o Primeiro
            </button>
          </div>
        )}

        {!isLoading && !error && feedbacks.length > 0 && (
          <SummaryCard feedbacks={feedbacks} />
        )}

        {/* Chart */}
        {!isLoading && !error && (
          <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_14px_30px_rgba(13,98,92,0.12)] p-6">
            <div className="flex items-start justify-between gap-3 mb-0.5">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#0f172a]">
                <span className="w-1 h-5 rounded-full bg-primary" />
                Suas Avaliações
              </h2>
              <Tooltip
                texto="Cada barra é um feedback que você enviou: a média das suas seis respostas daquele dia, na escala de 1 a 5."
                posicao="left"
              >
                <span aria-label="Como ler esta comparação" className="text-[#94a3b8] hover:text-primary cursor-help transition-colors flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
                  </svg>
                </span>
              </Tooltip>
            </div>
            <p className="text-sm text-[#64748b] mb-6">
              {pointsWithData < 2
                ? 'Média das suas respostas, de 1 (discordo totalmente) a 5 (concordo totalmente).'
                : 'Cada envio lado a lado, de 1 (discordo totalmente) a 5 (concordo totalmente).'}
            </p>
            <ComparacaoDeMarcos feedbacks={feedbacks} />
          </div>
        )}

        {/* History list */}
        {!isLoading && !error && historico.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#0f172a]">
                <span className="w-1 h-5 rounded-full bg-primary" />
                Histórico de Feedbacks
              </h2>
              <span className="text-sm text-[#64748b]">{feedbacks.length} registro{feedbacks.length !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-sm text-[#64748b]">
              Toque em um feedback para ver quais palavras do seu comentário mais pesaram no resultado.
            </p>
            {historico.map((fb, idx) => (
              <FeedbackCard
                key={fb.id}
                fb={fb}
                defaultOpen={idx === 0 && !recemEnviado}
                onInfo={() => setShowModal(true)}
                onRequestDelete={setConfirmDeleteId}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default StudentHistory;

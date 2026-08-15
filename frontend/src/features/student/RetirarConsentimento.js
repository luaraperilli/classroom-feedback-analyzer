import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apagarMeusDados } from '../../services/api';
import Spinner from '../../components/Spinner';

/**
 * Direito de eliminação e revogação do consentimento (LGPD, art. 18).
 *
 * Fica na própria ferramenta, e não como pedido por e-mail à pesquisadora: um
 * direito que depende de alguém atender manualmente é um direito com atrito.
 *
 * A confirmação é por digitação em vez de um segundo botão. A ação é
 * irreversível e não tem desfazer, então vale exigir um gesto deliberado.
 */
const PALAVRA_DE_CONFIRMACAO = 'APAGAR';

function RetirarConsentimento() {
  const { accessToken, logout } = useAuth();

  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState(null);

  const confirmar = async () => {
    setApagando(true);
    setErro(null);
    try {
      await apagarMeusDados(accessToken);
      logout();
    } catch (e) {
      setErro(e.message || 'Não foi possível apagar seus dados. Tente novamente.');
      setApagando(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_12px_28px_rgba(13,98,92,0.10)] p-6">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#0f172a] mb-1">
        <span className="w-1 h-5 rounded-full bg-[#dc2626]" />
        Retirar participação
      </h2>
      <p className="text-sm text-[#475569] leading-relaxed">
        Você pode sair da pesquisa quando quiser, sem justificar e sem qualquer efeito sobre
        a sua avaliação na disciplina. Isso apaga todos os feedbacks que você enviou e as
        análises geradas a partir deles.
      </p>

      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          className="mt-4 text-sm font-semibold text-[#dc2626] hover:text-[#b91c1c] transition"
        >
          Retirar meu consentimento e apagar meus dados
        </button>
      ) : (
        <div className="mt-4 border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-[#7f1d1d] leading-relaxed">
            Esta ação não pode ser desfeita. Para confirmar, digite{' '}
            <strong className="font-semibold">{PALAVRA_DE_CONFIRMACAO}</strong> abaixo.
          </p>

          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={PALAVRA_DE_CONFIRMACAO}
            aria-label={`Digite ${PALAVRA_DE_CONFIRMACAO} para confirmar`}
            className="w-full px-3 py-2 rounded-xl border border-red-200 bg-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-red-200"
          />

          {erro && <p className="text-sm text-[#dc2626]">{erro}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={confirmar}
              disabled={texto.trim() !== PALAVRA_DE_CONFIRMACAO || apagando}
              className="flex-1 py-2.5 rounded-xl bg-[#dc2626] text-white text-sm font-semibold
                         hover:bg-[#b91c1c] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {apagando ? (
                <span className="inline-flex items-center justify-center gap-2"><Spinner /> Apagando...</span>
              ) : 'Apagar tudo definitivamente'}
            </button>
            <button
              onClick={() => { setAberto(false); setTexto(''); setErro(null); }}
              disabled={apagando}
              className="flex-1 py-2.5 rounded-xl border border-[#cfe0da] bg-white text-[#475569]
                         text-sm font-semibold hover:bg-[#f1f5f9] transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RetirarConsentimento;

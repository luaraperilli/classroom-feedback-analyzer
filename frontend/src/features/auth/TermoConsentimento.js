import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getTermoConsentimento, registrarConsentimento } from '../../services/api';
import Spinner from '../../components/Spinner';

/**
 * Consentimento livre e esclarecido, no primeiro acesso do aluno.
 *
 * O texto vem do backend em vez de ficar escrito aqui: é ele que carrega a
 * versão registrada junto do aceite, e as duas coisas precisam sair da mesma
 * fonte para que o registro signifique alguma coisa.
 *
 * A recusa é uma saída de verdade, com o mesmo peso visual do aceite. Um "não"
 * escondido num link cinza tornaria o consentimento pouco livre — e livre é
 * requisito, não gentileza.
 */
function TermoConsentimento() {
  const { accessToken, updateUser, logout } = useAuth();

  const [termo, setTermo] = useState(null);
  const [marcado, setMarcado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [recusou, setRecusou] = useState(false);

  useEffect(() => {
    let cancelado = false;
    getTermoConsentimento()
      .then((dados) => { if (!cancelado) setTermo(dados); })
      .catch(() => { if (!cancelado) setErro('Não foi possível carregar o termo. Tente recarregar a página.'); });
    return () => { cancelado = true; };
  }, []);

  const aceitar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const perfil = await registrarConsentimento(accessToken);
      updateUser(perfil);
    } catch (e) {
      setErro(e.message || 'Não foi possível registrar seu aceite.');
      setEnviando(false);
    }
  };

  if (recusou) {
    return (
      <div className="min-h-screen bg-[#cde0d9] flex items-center justify-center px-4">
        <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_14px_30px_rgba(13,98,92,0.12)] p-8 max-w-md w-full space-y-4">
          <h1 className="text-xl font-bold text-[#0f172a]">Tudo bem</h1>
          <p className="text-sm text-[#475569] leading-relaxed">
            Sua participação é voluntária e essa escolha não tem nenhum efeito sobre a sua
            avaliação na disciplina. Se mudar de ideia, é só entrar de novo — o termo aparece
            outra vez.
          </p>
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (!termo) {
    return (
      <div className="min-h-screen bg-[#cde0d9] flex items-center justify-center">
        {erro ? <p className="text-sm text-[#dc2626]">{erro}</p> : <Spinner />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#cde0d9] py-8 px-4">
      <div className="max-w-2xl mx-auto bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_14px_30px_rgba(13,98,92,0.12)] p-6 sm:p-8">
        <h1 className="flex items-center gap-2.5 text-xl font-bold text-[#0f172a] mb-2">
          <span className="w-1 h-6 rounded-full bg-primary" />
          {termo.titulo}
        </h1>

        <p className="text-sm text-[#475569] leading-relaxed mb-6">{termo.resumo}</p>

        <div className="space-y-5">
          {termo.secoes.map((secao) => (
            <section key={secao.titulo}>
              <h2 className="text-base font-semibold text-[#1e293b] mb-1">{secao.titulo}</h2>
              <p className="text-sm text-[#475569] leading-relaxed">{secao.texto}</p>
            </section>
          ))}
        </div>

        <label className="flex items-start gap-3 mt-6 bg-primary/5 border border-primary/10 rounded-xl px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={marcado}
            onChange={(e) => setMarcado(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#0f766e] flex-shrink-0"
          />
          <span className="text-sm text-[#1e293b] leading-relaxed">{termo.aceite}</span>
        </label>

        {erro && <p className="text-sm text-[#dc2626] mt-3">{erro}</p>}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={aceitar}
            disabled={!marcado || enviando}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                       hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enviando ? 'Registrando...' : 'Concordo e quero participar'}
          </button>
          <button
            onClick={() => setRecusou(true)}
            disabled={enviando}
            className="flex-1 py-2.5 rounded-xl border border-[#cfe0da] text-[#475569] text-sm font-semibold
                       hover:bg-[#f1f5f9] transition"
          >
            Não quero participar
          </button>
        </div>

        <p className="text-sm text-[#94a3b8] mt-4 text-center">Versão {termo.versao} do termo</p>
      </div>
    </div>
  );
}

export default TermoConsentimento;

"""Limite de tentativas de login.

Sem isto, um atacante pode testar senhas à vontade — e as contas da turma nascem
com senha provisória, o que torna a força bruta um risco concreto.

O contador é em memória, por processo. Para o piloto, com uma instância só, isso
basta. Se um dia houver várias instâncias, cada uma terá seu próprio contador e
o limite efetivo será multiplicado pelo número delas.
"""

import threading
import time

MAX_TENTATIVAS_POR_USUARIO = 5
MAX_TENTATIVAS_POR_IP = 20
JANELA_SEGUNDOS = 15 * 60

_tentativas = {}
_lock = threading.Lock()


def _limpar(agora):
    """Descarta chaves cuja janela já passou, para a memória não crescer."""
    expiradas = [chave for chave, marcas in _tentativas.items()
                 if not marcas or agora - marcas[-1] > JANELA_SEGUNDOS]
    for chave in expiradas:
        del _tentativas[chave]


def _dentro_da_janela(chave, agora):
    marcas = [m for m in _tentativas.get(chave, []) if agora - m <= JANELA_SEGUNDOS]
    _tentativas[chave] = marcas
    return marcas


def verificar(usuario, ip):
    """Devolve os segundos de espera se o limite foi atingido, ou None se pode seguir."""
    agora = time.time()

    with _lock:
        _limpar(agora)

        for chave, teto in ((f"u:{usuario}", MAX_TENTATIVAS_POR_USUARIO),
                            (f"ip:{ip}", MAX_TENTATIVAS_POR_IP)):
            marcas = _dentro_da_janela(chave, agora)
            if len(marcas) >= teto:
                return int(JANELA_SEGUNDOS - (agora - marcas[0])) + 1

    return None


def registrar_falha(usuario, ip):
    agora = time.time()
    with _lock:
        for chave in (f"u:{usuario}", f"ip:{ip}"):
            _tentativas.setdefault(chave, []).append(agora)


def limpar(usuario):
    """Login bem-sucedido zera o contador daquele usuário."""
    with _lock:
        _tentativas.pop(f"u:{usuario}", None)

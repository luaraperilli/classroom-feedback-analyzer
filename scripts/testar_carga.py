#!/usr/bin/env python3
"""Simula uma turma enviando feedback ao mesmo tempo e cronometra cada etapa.

Por que existe: os tempos que medimos até aqui vieram de envios isolados, um de
cada vez. O que decide o dia 3 é outra coisa, que é o que acontece quando trinta
alunos apertam Enviar no mesmo minuto. Com --concurrency 1 no Cloud Run, cada
requisição ocupa uma instância inteira, e as que chegam além do teto esperam na
fila. Este script mede exatamente isso.

O que ele cronometra, por aluno:

  login        autenticação, que paga a partida a frio se houver
  envio        POST /analyze, o caminho crítico: é aqui que o feedback é gravado
  explicação   até o destaque por palavra aparecer, consultando como a tela faz

O envio é o número que importa para a coleta. A explicação é conforto: ela
acontece em segundo plano e o feedback já está salvo antes de ela começar.

Uso:

    python scripts/testar_carga.py --alunos carga01:Senha123 carga02:Senha123 ...
    python scripts/testar_carga.py --prefixo carga --quantidade 10 --senha Senha123

Antes, crie as contas e aceite o termo por elas (o script aceita automaticamente
se ainda estiver pendente):

    for i in $(seq -w 1 10); do
      flask --app run.py criar-aluno --username carga$i --nome Teste --sobrenome Carga$i
    done

Depois, apague as linhas de teste do banco. Elas não podem entrar na análise.
"""

import argparse
import json
import ssl
import statistics
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

URL_PADRAO = 'https://voz-discente-api-960838311333.southamerica-east1.run.app'
SENHA_INICIAL = '123'

# Comentários de comprimentos variados, para que a saída mostre a relação entre
# tamanho e tempo em vez de um número único sem contexto. O limite da tela é 400.
COMENTARIOS = [
    'Gostei.',
    'A aula foi boa e consegui acompanhar.',
    'O ritmo esteve adequado e o professor explicou com clareza os pontos principais.',
    'Achei a aula proveitosa, ainda que alguns trechos tenham ficado corridos. '
    'Consegui acompanhar o raciocínio e sair com uma ideia clara do assunto.',
    'A disciplina tem um ritmo bom e o professor explica com clareza, mas sinto '
    'que a parte prática poderia ter mais tempo em sala. Consigo acompanhar o '
    'conteúdo teórico sem dificuldade, porém, quando chega o momento de aplicar, '
    'percebo que faltou repetição para fixar o que foi visto nas aulas anteriores.',
]

_trava = threading.Lock()


def falar(mensagem):
    with _trava:
        print(mensagem, flush=True)


class Erro(Exception):
    pass


def pedir(url, caminho, corpo=None, token=None, metodo=None, timeout=300):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(url + caminho, data=dados, method=metodo or ('POST' if dados else 'GET'))
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')

    contexto = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=contexto) as resposta:
            texto = resposta.read().decode()
            return resposta.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except json.JSONDecodeError:
            return e.code, {'error': texto[:200]}


def entrar(url, usuario, senha):
    """Autentica, tratando o primeiro acesso com senha provisória."""
    status, corpo = pedir(url, '/login', {'username': usuario, 'password': senha})

    if status != 200:
        # Conta nova ainda com a senha provisória: entra, define a definitiva e
        # segue, para o script não exigir preparação manual de cada aluno.
        status, corpo = pedir(url, '/login', {'username': usuario, 'password': SENHA_INICIAL})
        if status != 200:
            raise Erro(f'login recusado: {corpo}')
        token = corpo['access_token']
        st, _ = pedir(url, '/change-initial-password', {'new_password': senha}, token=token)
        if st != 200:
            raise Erro('não foi possível definir a senha')
        status, corpo = pedir(url, '/login', {'username': usuario, 'password': senha})

    if corpo['user'].get('must_change_password'):
        pedir(url, '/change-initial-password', {'new_password': senha}, token=corpo['access_token'])
        status, corpo = pedir(url, '/login', {'username': usuario, 'password': senha})

    return corpo['access_token'], corpo['user']


def um_aluno(url, usuario, senha, disciplina, comentario, aguardar_explicacao):
    resultado = {'usuario': usuario, 'caracteres': len(comentario)}

    inicio = time.perf_counter()
    token, dados = entrar(url, usuario, senha)
    resultado['login'] = time.perf_counter() - inicio

    if dados.get('consentimento_pendente'):
        pedir(url, '/consentimento', {}, token=token)

    envio = {
        'subject_id': disciplina,
        'active_participation': 4, 'task_completion': 4, 'motivation_interest': 4,
        'welcoming_environment': 4, 'comprehension_effort': 4, 'content_connection': 4,
        'additional_comment': comentario,
    }

    inicio = time.perf_counter()
    status, corpo = pedir(url, '/analyze', envio, token=token)
    resultado['envio'] = time.perf_counter() - inicio

    if status == 409:
        resultado['erro'] = 'já enviou hoje nesta disciplina'
        return resultado
    if status != 201:
        resultado['erro'] = f'HTTP {status}: {corpo}'
        return resultado

    resultado['id'] = corpo['id']
    falar(f'  {usuario}: gravado em {resultado["envio"]:.1f}s (feedback {corpo["id"]})')

    if not aguardar_explicacao:
        return resultado

    # Dispara e acompanha como a tela faz, sem segurar a requisição aberta.
    inicio = time.perf_counter()
    pedir(url, f'/feedbacks/{corpo["id"]}/explicacao', {}, token=token, timeout=120)

    for _ in range(60):
        st, lista = pedir(url, '/my-feedbacks', token=token)
        atual = next((f for f in (lista or []) if f['id'] == corpo['id']), None)
        if atual and (atual.get('token_attributions') or atual.get('shap_attributions')):
            resultado['explicacao'] = time.perf_counter() - inicio
            return resultado
        time.sleep(10)

    resultado['explicacao'] = None
    resultado['erro'] = 'explicação não ficou pronta em 10 minutos'
    return resultado


def resumo(titulo, valores):
    if not valores:
        return
    print(f'{titulo:14s} mín {min(valores):6.1f}s   mediana {statistics.median(valores):6.1f}s   '
          f'máx {max(valores):6.1f}s')


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--url', default=URL_PADRAO)
    p.add_argument('--alunos', nargs='*', default=[],
                   help='pares usuario:senha')
    p.add_argument('--prefixo', help='gera os usuários como prefixo01, prefixo02...')
    p.add_argument('--quantidade', type=int, default=10)
    p.add_argument('--senha', default='Senha123')
    p.add_argument('--disciplina', type=int, default=1)
    p.add_argument('--sem-explicacao', action='store_true',
                   help='mede só o envio, que é o caminho crítico da coleta')
    args = p.parse_args()

    if args.prefixo:
        contas = [(f'{args.prefixo}{i:02d}', args.senha) for i in range(1, args.quantidade + 1)]
    else:
        contas = [tuple(a.split(':', 1)) for a in args.alunos]

    if not contas:
        p.error('informe --alunos ou --prefixo')

    print(f'{len(contas)} alunos, disciplina {args.disciplina}, todos ao mesmo tempo')
    print(f'{args.url}\n')

    inicio = time.perf_counter()
    with ThreadPoolExecutor(max_workers=len(contas)) as executor:
        futuros = [
            executor.submit(um_aluno, args.url, usuario, senha, args.disciplina,
                            COMENTARIOS[i % len(COMENTARIOS)], not args.sem_explicacao)
            for i, (usuario, senha) in enumerate(contas)
        ]
        resultados = []
        for f in futuros:
            try:
                resultados.append(f.result())
            except Exception as e:
                resultados.append({'usuario': '?', 'erro': str(e)})
    total = time.perf_counter() - inicio

    print(f'\n{"aluno":12s} {"chars":>6} {"login":>8} {"envio":>8} {"explicação":>11}   situação')
    print('-' * 68)
    for r in sorted(resultados, key=lambda x: x.get('usuario', '')):
        exp = f'{r["explicacao"]:.1f}s' if r.get('explicacao') else ('—' if 'explicacao' not in r else 'falhou')
        print(f'{r.get("usuario", "?"):12s} {r.get("caracteres", 0):>6} '
              f'{r.get("login", 0):>7.1f}s {r.get("envio", 0):>7.1f}s {exp:>11}   '
              f'{r.get("erro", "ok")}')

    print()
    resumo('login', [r['login'] for r in resultados if 'login' in r])
    resumo('envio', [r['envio'] for r in resultados if 'envio' in r])
    resumo('explicação', [r['explicacao'] for r in resultados if r.get('explicacao')])

    gravados = sum(1 for r in resultados if r.get('id'))
    print(f'\n{gravados} de {len(contas)} feedbacks gravados, tudo em {total:.1f}s')

    piores = [r['envio'] for r in resultados if 'envio' in r]
    if piores and max(piores) > 60:
        print(f'\nATENÇÃO: o envio mais lento levou {max(piores):.1f}s. Acima de 120s a tela '
              f'desiste e passa a conferir se gravou, o que ainda funciona, mas é sinal de '
              f'que faltou instância. Confira --max-instances e --min-instances.')

    if gravados < len(contas):
        sys.exit(1)


if __name__ == '__main__':
    main()

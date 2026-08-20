#!/usr/bin/env python3
"""Bateria de aceitação contra o sistema publicado.

Diferente do testar_carga.py, que mede tempo, este verifica comportamento: se o
primeiro acesso conduz o aluno pelas etapas certas, se o envio sem consentimento
é recusado, se a explicação sai íntegra, se o rótulo de sentimento corresponde à
distribuição do modelo e se um aluno não alcança o feedback de outro.

Cada verificação diz o que esperava e o que recebeu, para que uma falha seja
diagnosticável sem precisar reproduzir na mão.

O que este script NÃO cobre, e continua sendo trabalho de olho humano: as telas,
o celular, a barra de progresso andando, as cores, e o comportamento quando a
conexão cai no meio. Isso está no roteiro-de-validacao.md.

Preparação, uma vez só:

    source venv/bin/activate
    for i in 1 2 3 4; do
      flask --app run.py criar-aluno --username valid0$i --nome Teste --sobrenome Validacao$i
    done

Uso:

    python scripts/validar_sistema.py --disciplinas 1 2

As contas precisam estar recém-criadas, com senha provisória e sem consentimento,
porque o primeiro bloco testa justamente esse caminho. Para repetir a bateria,
apague e recrie as contas.
"""

import argparse
import json
import ssl
import sys
import time
import urllib.error
import urllib.request

URL_PADRAO = 'https://voz-discente-api-960838311333.southamerica-east1.run.app'
SENHA_INICIAL = '123'
SENHA_NOVA = 'Validacao123'

POSITIVO = ('A aula de hoje foi excelente. O professor explicou o conteúdo com muita '
            'clareza e consegui entender tudo sem dificuldade nenhuma.')
NEGATIVO = ('A aula foi péssima e confusa. Não entendi absolutamente nada, o professor '
            'se perdeu várias vezes e saí da sala mais perdido do que entrei.')
MISTO = ('Como não sou disciplinado, entendo que a culpa por não ter acompanhado as '
         'aulas como deveria é inteiramente minha. O professor é ótimo, mas entendo '
         'que eu preciso me dedicar mais.')
CAIXAS = ('Não consegui acompanhar a aula de hoje. Nada do que foi dito ficou claro, '
          'e não adiantou reler o material. Nada faz sentido ainda.')

RESPOSTAS_OK = {
    'active_participation': 4, 'task_completion': 4, 'motivation_interest': 4,
    'welcoming_environment': 4, 'comprehension_effort': 4, 'content_connection': 4,
}

resultados = []


def checar(ok, descricao, detalhe=''):
    resultados.append((ok, descricao, detalhe))
    marca = 'OK   ' if ok else 'FALHA'
    print(f'  {marca} {descricao}')
    if detalhe and not ok:
        print(f'         {detalhe}')
    elif detalhe:
        print(f'         {detalhe}')


def titulo(texto):
    print(f'\n{texto}')
    print('-' * len(texto))


def pedir(url, caminho, corpo=None, token=None, metodo=None, timeout=300):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(url + caminho, data=dados,
                                 method=metodo or ('POST' if dados is not None else 'GET'))
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=timeout,
                                    context=ssl.create_default_context()) as r:
            texto = r.read().decode()
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except json.JSONDecodeError:
            return e.code, {'error': texto[:200]}
    except Exception as e:
        return 0, {'error': str(e)}


def envio(disciplina, comentario, **extra):
    return {'subject_id': disciplina, **RESPOSTAS_OK, 'additional_comment': comentario, **extra}


def aguardar_explicacao(url, token, id_fb, limite=420):
    """Acompanha como a tela faz, sem segurar a requisição aberta."""
    inicio = time.time()
    pedir(url, f'/feedbacks/{id_fb}/explicacao', {}, token=token, timeout=150)
    while time.time() - inicio < limite:
        _, lista = pedir(url, '/my-feedbacks', token=token, timeout=60)
        atual = next((f for f in (lista or []) if f['id'] == id_fb), None)
        if atual and (atual.get('token_attributions') or atual.get('shap_attributions')):
            return atual, time.time() - inicio
        time.sleep(10)
    return None, time.time() - inicio


# ---------------------------------------------------------------- blocos


def bloco_primeiro_acesso(url, usuario):
    titulo('1. Primeiro acesso, o caminho que todo aluno vai percorrer')

    st, corpo = pedir(url, '/login', {'username': usuario, 'password': SENHA_INICIAL})
    if st != 200:
        checar(False, 'entra com a senha provisória',
               f'recebeu {st}: {corpo}. A conta {usuario} precisa ser recém-criada.')
        return None
    checar(True, 'entra com a senha provisória')

    token = corpo['access_token']
    u = corpo['user']
    checar(u.get('must_change_password') is True,
           'o login já avisa que a senha precisa ser trocada',
           f'must_change_password={u.get("must_change_password")}')
    checar(u.get('consentimento_pendente') is True,
           'o login já avisa que o termo está pendente',
           'sem isso a tela só descobriria ao recarregar, e o aluno preencheria em vão')

    st, corpo = pedir(url, '/analyze', envio(1, POSITIVO), token=token)
    checar(st == 403, 'envio antes de consentir é recusado', f'recebeu {st}')

    st, _ = pedir(url, '/change-initial-password', {'new_password': SENHA_NOVA}, token=token)
    checar(st == 200, 'define a senha própria', f'recebeu {st}')

    st, corpo = pedir(url, '/login', {'username': usuario, 'password': SENHA_NOVA})
    checar(st == 200 and corpo['user'].get('must_change_password') is False,
           'entra com a senha nova e não é mais mandado trocar')
    checar(corpo['user'].get('consentimento_pendente') is True,
           'o termo continua pendente depois de trocar a senha')

    token = corpo['access_token']
    st, termo = pedir(url, '/termo-consentimento', token=token)
    checar(st == 200 and termo.get('versao'), 'o termo é servido com número de versão',
           f'versão {termo.get("versao")}')
    checar(any('LGPD' in s.get('texto', '') or '13.709' in s.get('texto', '')
               for s in termo.get('secoes', [])),
           'o termo cita a base legal')

    st, corpo = pedir(url, '/consentimento', {}, token=token)
    checar(st == 200 and corpo.get('consentimento_pendente') is False,
           'registra o consentimento')

    st, perfil = pedir(url, '/profile', token=token)
    checar(perfil.get('consentimento_pendente') is False, 'o perfil confirma o aceite')
    return token


def bloco_regras_de_envio(url, token, disciplina):
    titulo('2. Regras do envio')

    def recusa(descricao, corpo):
        """Confere que o envio inválido é recusado, e desfaz se tiver passado.

        Um envio que deveria ser recusado e é aceito ocupa a vaga do dia naquela
        disciplina, e todo o resto da bateria falha por 409 sem que a causa
        apareça. Foi o que aconteceu na primeira execução: o comentário de 401
        caracteres passou e derrubou quatro blocos.
        """
        st, resposta = pedir(url, '/analyze', corpo, token=token)
        checar(st == 400, descricao, f'recebeu {st}')
        if st == 201 and resposta and resposta.get('id'):
            pedir(url, f'/my-feedbacks/{resposta["id"]}', token=token, metodo='DELETE')
            print('         (o envio foi aceito e precisou ser desfeito, '
                  'para não ocupar a vaga do dia)')

    recusa('comentário acima de 400 caracteres é recusado',
           envio(disciplina, 'x' * 401))

    incompleto = envio(disciplina, POSITIVO)
    del incompleto['task_completion']
    recusa('envio com pergunta sem resposta é recusado', incompleto)

    recusa('nota fora da escala de 1 a 5 é recusada',
           envio(disciplina, POSITIVO, active_participation=9))

    recusa('comentário em branco é recusado', envio(disciplina, '   '))


def bloco_coleta(url, token, disciplina):
    titulo('3. Envio, sentimento e limite diário')

    inicio = time.time()
    st, fb = pedir(url, '/analyze', envio(disciplina, POSITIVO), token=token)
    tempo = time.time() - inicio
    if st != 201:
        pista = ('. Algum envio do bloco 2 passou quando devia ser recusado e ocupou '
                 'a vaga do dia' if st == 409 else '')
        checar(False, 'envio aceito', f'recebeu {st}: {fb}{pista}')
        return None
    checar(True, 'envio aceito', f'{tempo:.1f}s')
    checar(tempo < 30, 'o envio responde rápido, sem esperar o cálculo pesado',
           f'{tempo:.1f}s, e o caminho crítico da coleta é este')

    for campo in ('compound', 'pos', 'neg', 'neu'):
        checar(fb.get(campo) is not None, f'o envio já traz {campo}')
    soma = (fb.get('pos') or 0) + (fb.get('neg') or 0) + (fb.get('neu') or 0)
    checar(abs(soma - 1.0) < 0.02, 'as três probabilidades somam 1',
           f'soma {soma:.4f}')
    checar(abs((fb['pos'] - fb['neg']) - fb['compound']) < 0.002,
           'compound é a diferença entre positivo e negativo',
           f'{fb["pos"]:.4f} - {fb["neg"]:.4f} = {fb["pos"]-fb["neg"]:.4f}, gravado {fb["compound"]}')

    st, _ = pedir(url, '/analyze', envio(disciplina, NEGATIVO), token=token)
    checar(st == 409, 'segundo envio na mesma disciplina no mesmo dia é recusado',
           f'recebeu {st}')

    return fb


def bloco_explicabilidade(url, token, fb):
    titulo('4. Explicabilidade, o coração do trabalho')

    completo, tempo = aguardar_explicacao(url, token, fb['id'])
    if not completo:
        checar(False, 'a explicação fica pronta', f'não chegou em {tempo:.0f}s')
        return
    checar(True, 'a explicação fica pronta', f'{tempo:.0f}s')

    lime = completo.get('token_attributions') or {}
    shap = completo.get('shap_attributions') or {}

    checar(len(lime) > 0, 'o LIME devolveu atribuições', f'{len(lime)} palavras')
    checar(len(shap) > 0, 'o SHAP devolveu atribuições', f'{len(shap)} palavras')
    checar(len(lime) <= 10, 'o LIME respeita num_features=10', f'{len(lime)} palavras')

    if lime:
        maior = max(abs(v) for v in lime.values())
        checar(abs(maior - 1.0) < 1e-6,
               'a normalização do LIME chega a 1,0',
               f'maior peso absoluto {maior:.4f}. Abaixo de 1 significa palavra '
               f'perdida por colisão de caixa, o defeito corrigido em 20 de agosto')

    if lime and shap:
        comuns = [p for p in lime if p in shap]
        iguais = [p for p in comuns if (lime[p] > 0) == (shap[p] > 0)]
        checar(len(comuns) > 0, 'as duas técnicas falam das mesmas palavras',
               f'{len(comuns)} palavras em comum')
        divergentes = [p for p in comuns if p not in iguais]
        checar(True, f'convergência: {len(iguais)} de {len(comuns)} com o mesmo sinal',
               f'removidas do destaque: {divergentes if divergentes else "nenhuma"}')
        for p in divergentes:
            forca = abs(lime[p])
            if forca > 0.4:
                checar(False, f'"{p}" é forte no LIME mas foi removida pelo filtro',
                       f'LIME {lime[p]:+.4f}, SHAP {shap[p]:+.4f}. Vale conferir na tela '
                       f'se a ausência dela empobrece o destaque')

    st, _ = pedir(url, f'/feedbacks/{fb["id"]}/explicacao', {}, token=token, timeout=60)
    checar(st == 200, 'repetir o pedido devolve o que já está gravado, sem recalcular',
           f'recebeu {st}, e a resposta foi imediata')


def bloco_caixa_das_palavras(url, token, disciplina):
    titulo('5. Palavras repetidas em caixas diferentes')

    st, fb = pedir(url, '/analyze', envio(disciplina, CAIXAS), token=token)
    if st != 201:
        checar(False, 'envio do comentário com "Não" e "não"', f'recebeu {st}: {fb}')
        return
    completo, tempo = aguardar_explicacao(url, token, fb['id'])
    if not completo:
        checar(False, 'a explicação fica pronta', f'não chegou em {tempo:.0f}s')
        return

    lime = completo.get('token_attributions') or {}
    maior = max(abs(v) for v in lime.values()) if lime else 0
    checar(abs(maior - 1.0) < 1e-6,
           'a normalização chega a 1,0 mesmo com palavra repetida em duas caixas',
           f'maior peso {maior:.4f}. Este é o teste direto do defeito do feedback 14')
    checar('não' in lime or 'nada' in lime,
           'as palavras repetidas aparecem entre as mais influentes',
           f'palavras: {sorted(lime, key=lambda p: -abs(lime[p]))[:5]}')


def bloco_rotulo(url, contas, disciplina, senha):
    titulo('6. Rótulo de sentimento, a crítica do orientador')

    casos = [
        ('claramente elogioso', POSITIVO, 'pos'),
        ('claramente crítico', NEGATIVO, 'neg'),
        ('misto, elogia o professor e se critica', MISTO, None),
    ]

    for (nome, comentario, esperado), usuario in zip(casos, contas):
        st, corpo = pedir(url, '/login', {'username': usuario, 'password': senha})
        if st != 200:
            checar(False, f'{nome}: entra com {usuario}', f'recebeu {st}')
            continue
        token = corpo['access_token']
        if corpo['user'].get('consentimento_pendente'):
            pedir(url, '/consentimento', {}, token=token)

        st, fb = pedir(url, '/analyze', envio(disciplina, comentario), token=token)
        if st != 201:
            checar(False, f'{nome}: envio aceito', f'recebeu {st}: {fb}')
            continue

        pos, neg, neu = fb['pos'], fb['neg'], fb['neu']
        maioria = ('positivo' if pos > 0.5 else 'negativo' if neg > 0.5
                   else 'neutro' if neu > 0.5 else 'MISTO')
        detalhe = f'pos {pos:.3f}, neg {neg:.3f}, neu {neu:.3f} -> {maioria}'

        if esperado == 'pos':
            checar(pos > 0.5, f'{nome} tem maioria positiva', detalhe)
        elif esperado == 'neg':
            checar(neg > 0.5, f'{nome} tem maioria negativa', detalhe)
        else:
            checar(maioria == 'MISTO',
                   'o comentário misto não tem maioria, e sai como Misto', detalhe)
            antigo = 'Positivo' if pos - neg >= 0.05 else 'Negativo' if pos - neg <= -0.05 else 'Neutro'
            checar(True, f'a regra antiga chamaria isso de "{antigo}"',
                   'é exatamente o ponto levantado pelo orientador')


def bloco_isolamento(url, usuario_a, usuario_b, senha, id_fb):
    titulo('7. Um aluno não alcança o feedback de outro')

    st, corpo = pedir(url, '/login', {'username': usuario_b, 'password': senha})
    if st != 200:
        checar(False, f'entra com {usuario_b}', f'recebeu {st}')
        return
    token = corpo['access_token']

    st, _ = pedir(url, f'/feedbacks/{id_fb}/explicacao', {}, token=token, timeout=60)
    checar(st == 404, 'pedir a explicação de outro aluno devolve 404',
           f'recebeu {st}. Seria 403 se vazasse que o feedback existe')

    st, _ = pedir(url, f'/my-feedbacks/{id_fb}', token=token, metodo='DELETE')
    checar(st in (403, 404), 'apagar o feedback de outro aluno é recusado', f'recebeu {st}')

    st, lista = pedir(url, '/my-feedbacks', token=token)
    ids = {f['id'] for f in (lista or [])}
    checar(id_fb not in ids, 'o histórico traz só os feedbacks do próprio aluno')

    st, _ = pedir(url, '/feedbacks', token=token)
    checar(st == 403, 'aluno não acessa a listagem da turma', f'recebeu {st}')

    st, _ = pedir(url, '/global-shap', token=token)
    checar(st == 403, 'aluno não acessa a análise agregada do docente', f'recebeu {st}')


def bloco_apagar_e_reenviar(url, usuario, senha, disciplina):
    titulo('8. Apagar libera novo envio no mesmo dia')

    st, corpo = pedir(url, '/login', {'username': usuario, 'password': senha})
    token = corpo['access_token']
    if corpo['user'].get('consentimento_pendente'):
        pedir(url, '/consentimento', {}, token=token)

    st, primeiro = pedir(url, '/analyze', envio(disciplina, POSITIVO), token=token)
    if st != 201:
        checar(False, 'primeiro envio', f'recebeu {st}: {primeiro}')
        return
    checar(True, 'primeiro envio aceito')

    st, _ = pedir(url, '/analyze', envio(disciplina, NEGATIVO), token=token)
    checar(st == 409, 'o segundo é recusado enquanto o primeiro existe', f'recebeu {st}')

    st, _ = pedir(url, f'/my-feedbacks/{primeiro["id"]}', token=token, metodo='DELETE')
    checar(st == 200, 'apaga o próprio feedback', f'recebeu {st}')

    st, segundo = pedir(url, '/analyze', envio(disciplina, NEGATIVO), token=token)
    checar(st == 201, 'consegue enviar outro depois de apagar', f'recebeu {st}')

    st, lista = pedir(url, '/my-feedbacks', token=token)
    ids = {f['id'] for f in (lista or [])}
    checar(primeiro['id'] not in ids, 'o apagado não volta no histórico')


def bloco_docente(url, professor, senha):
    titulo('9. Visão do docente')

    st, corpo = pedir(url, '/login', {'username': professor, 'password': senha})
    if st != 200:
        checar(False, f'entra como {professor}',
               f'recebeu {st}. Passe --professor usuario:senha para testar este bloco')
        return
    token = corpo['access_token']

    st, feedbacks = pedir(url, '/feedbacks', token=token)
    checar(st == 200, 'acessa a listagem da turma', f'recebeu {st}')
    if st != 200 or not feedbacks:
        return

    identificadores = {'student_id', 'student', 'username', 'first_name', 'last_name', 'aluno'}
    vazando = [c for fb in feedbacks[:20] for c in fb if c in identificadores]
    checar(not vazando, 'nenhum campo identifica o aluno nos feedbacks da turma',
           f'campos encontrados: {sorted(set(vazando))}' if vazando
           else f'{len(feedbacks)} feedbacks conferidos')

    st, _ = pedir(url, '/global-shap', token=token)
    checar(st == 200, 'acessa a análise agregada por valores de Shapley', f'recebeu {st}')

    st, risco = pedir(url, '/students-at-risk', token=token)
    checar(st == 200, 'acessa a análise de risco, onde a identificação é intencional',
           f'recebeu {st}')


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--url', default=URL_PADRAO)
    p.add_argument('--prefixo', default='valid')
    p.add_argument('--senha', default=SENHA_NOVA)
    p.add_argument('--disciplinas', nargs=2, type=int, default=[1, 2])
    p.add_argument('--professor', help='usuario:senha, para o bloco 9')
    p.add_argument('--rapido', action='store_true',
                   help='pula os blocos que esperam o cálculo da explicação')
    args = p.parse_args()

    a, b, c, d = (f'{args.prefixo}0{i}' for i in range(1, 5))
    d1, d2 = args.disciplinas

    print(f'Bateria de aceitação em {args.url}')
    print(f'Contas: {a}, {b}, {c}, {d}   Disciplinas: {d1} e {d2}')
    print('As contas precisam estar recém-criadas, com senha provisória e sem consentimento.')

    inicio = time.time()

    token = bloco_primeiro_acesso(args.url, a)
    if not token:
        print('\nO primeiro bloco não passou, e os demais dependem dele. Recrie as contas.')
        sys.exit(1)

    bloco_regras_de_envio(args.url, token, d1)
    fb = bloco_coleta(args.url, token, d1)

    if fb and not args.rapido:
        bloco_explicabilidade(args.url, token, fb)
        bloco_caixa_das_palavras(args.url, token, d2)

    if fb:
        bloco_isolamento(args.url, a, b, SENHA_INICIAL, fb['id'])

    bloco_rotulo(args.url, [b, c, d], d1, SENHA_INICIAL)
    bloco_apagar_e_reenviar(args.url, d, SENHA_INICIAL, d2)

    if args.professor:
        usuario, senha = args.professor.split(':', 1)
        bloco_docente(args.url, usuario, senha)
    else:
        titulo('9. Visão do docente')
        print('  PULADO  passe --professor usuario:senha para incluir este bloco')

    passou = sum(1 for ok, _, _ in resultados if ok)
    total = len(resultados)
    print(f'\n{"=" * 60}')
    print(f'{passou} de {total} verificações passaram, em {time.time() - inicio:.0f}s')

    falhas = [(d, det) for ok, d, det in resultados if not ok]
    if falhas:
        print(f'\n{len(falhas)} FALHA(S):')
        for descricao, detalhe in falhas:
            print(f'  - {descricao}')
            if detalhe:
                print(f'    {detalhe}')
        sys.exit(1)

    print('\nO que este script não vê, e continua sendo trabalho seu:')
    print('  as telas, o celular, a barra de progresso andando, as cores,')
    print('  e o que acontece quando a conexão cai no meio do cálculo.')


if __name__ == '__main__':
    main()

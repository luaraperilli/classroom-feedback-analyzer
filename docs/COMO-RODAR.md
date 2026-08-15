# Como rodar

## Antes de tudo

Apague o arquivo que sobrou da versão anterior — enquanto ele existir, o frontend não
compila, porque importa funções que não existem mais na API:

```bash
rm frontend/src/features/dashboard/ThemeManager.js
```

## Backend

O esquema do banco agora é gerenciado pelo Alembic, e o seed deixou de rodar sozinho no
boot. São três comandos na primeira vez e um nas seguintes.

```bash
cd ~/Documents/Claude/Projects/TFG/classroom-feedback-analyzer
source venv/bin/activate
pip install -r requirements-dev.txt

export FLASK_APP=run.py
export FLASK_CONFIG=development

flask db upgrade
flask popular-demo
python run.py
```

O `flask db upgrade` cria o esquema — só na primeira vez e a cada nova migration. O
`popular-demo` insere os dados de demonstração e é opcional. O backend sobe em
http://localhost:5001.

Não cole os comandos com comentários no fim da linha: no zsh interativo o `#` não é
comentário por padrão, e os parênteses acabam interpretados como filtro de arquivo
("unknown file attribute").

Nas próximas vezes, só `source venv/bin/activate && python run.py`.

O `pip install` baixa o torch e o pysentimiento — são alguns GB e demora. O modelo em si
(~500 MB) só é baixado no primeiro comentário analisado, porque agora o carregamento é sob
demanda: importar o app não puxa mais os pesos.

### Contas de demonstração

O `popular-demo` cria duas disciplinas com a estrutura do piloto — Interação
Humano-Computador com três marcos e Informática na Educação com dois — mais um professor,
um coordenador e seis alunos. A senha de todas as contas é `Demo1234`.

O último marco de cada disciplina nasce aberto; os anteriores, encerrados e já com
respostas, para o painel do docente não nascer vazio.

## Frontend

Em outro terminal:

```bash
cd frontend
npm install     # só na 1ª vez
npm start       # http://localhost:3000
```

O `npm run dev` continua subindo os dois de uma vez, mas ele não roda as migrations —
use-o só depois de já ter feito o `flask db upgrade` pelo menos uma vez.

## Testes

```bash
FLASK_CONFIG=testing python3 -m pytest
```

São 14 testes e não precisam do modelo de NLP: ele é substituído por uma versão
determinística, porque o que está sendo verificado são as regras de marco, matrícula,
anonimato e papéis.

## Preparar o piloto de verdade

Sem dados de demonstração, com o banco vazio:

```bash
flask criar-coordenador --username coordenacao
flask criar-professor --username rodrigo --nome Rodrigo --sobrenome Seabra

flask criar-disciplina --nome "Interação Humano-Computador" --professor rodrigo \
      --marcos "Aulas iniciais e P1;Segundo bloco e P2;Seminários"
flask criar-disciplina --nome "Informática na Educação" --professor rodrigo \
      --marcos "Seminário;Entrega e apresentação do produto"

flask matricular --disciplina "Interação Humano-Computador" --arquivo turma-ihc.txt
```

O arquivo da turma é uma linha por aluno, no formato `usuario;Nome;Sobrenome`. As senhas
provisórias saem em CSV na tela, uma única vez — todos são obrigados a trocá-la no
primeiro acesso.

Os marcos nascem em rascunho de propósito: quem abre a coleta é o docente, pelo painel.

Outros comandos: `flask listar-usuarios` e `flask redefinir-senha --username fulano`,
que substitui o "esqueci minha senha" enquanto ele não existe.

## Variáveis de ambiente

Em desenvolvimento não precisa de nada — há fallbacks seguros. Em produção,
`SECRET_KEY`, `JWT_SECRET_KEY`, `CORS_ORIGINS` e `DATABASE_URL` são obrigatórias e a
aplicação falha o boot sem elas, de propósito. Veja `.env.example`.

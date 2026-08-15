# Pendências

Detalhes em `AUDITORIA.md`, `CONSISTENCIA-ARTIGO-CODIGO.md` e `DECISOES-ORIENTACAO.md`.

---

## 1. Testar de verdade

Nada foi executado com o modelo real. Todas as mudanças estão validadas por
compilação, build e boot com o pysentimiento stubado — nenhuma por uso.

Antes de qualquer outra coisa: subir local, entrar como aluno, enviar um feedback
completo, conferir o destaque das palavras, o gráfico e a exclusão; depois entrar
como professor e abrir o dashboard.

## 2. Bloqueadores de deploy — corrigidos, falta validar

Todos foram resolvidos: `load_dotenv` no topo do `config.py`, normalização da URI
do Supabase, perfil padrão `production` com validação que falha o boot, migration
leve restrita ao SQLite, gunicorn com `wsgi.py`, `/health`, Dockerfile com torch
CPU-only, dependências fixas, `vercel.json` com rewrite de SPA e `.env.example`
nos dois lados.

Também voltou o processamento em lote do `_predict_proba`, que havia se perdido
no revert: sem ele, as 5.000 perturbações do LIME viravam 5.000 chamadas
sequenciais ao modelo, de 3 a 6 minutos por feedback — acima do timeout do
gunicorn, do Cloud Run e do frontend. Em lotes de 32 são 157 chamadas.

**Falta medir o tempo real do `/analyze`** com o modelo de verdade. Se ficar
acima de dois minutos, o envio precisa virar job assíncrono com polling.

## 3. Ajustes no texto

A Seção 3.1.2 deve dizer que o docente sinaliza o marco **à turma**, e que o
sistema registra a data de cada submissão — o formulário fica sempre aberto, com
o limite diário servindo apenas de proteção contra duplicata.

react-chartjs-2 → recharts na Seção 3.2. Tirar "LIME / SHAP" da caixa do aluno na
Figura 1, que contradiz a própria Seção 3.5. O filtro por intervalos de marcos
citado na 3.5 não existe. SQLite → Postgres na 3.2 e na figura, quando migrarmos.

Mais adiante: a subseção do TAM no Método, o TCLE como apêndice e os prints da
Seção 3.5, que só podem ser feitos com o sistema congelado.

## 4. Infraestrutura

Conectar o Supabase, publicar o backend no Cloud Run e o frontend na Vercel.
Medir o tempo real do `/analyze` para decidir se precisa virar job assíncrono.

**Simular o piloto** com as duas disciplinas antes de levar para a turma. O
Rodrigo foi direto: *"a hora que a gente levar isso pra sala de aula e não tem
mais retorno"*.

## 5. Menores

Não há testes automatizados — a suíte foi removida junto com os arquivos órfãos.

O seeder ainda cria as disciplinas antigas em inglês e os usuários `Coordenador`
e `Professor`. Só roda em desenvolvimento, mas destoa do cenário do piloto.

O índice de risco tem `CONSISTENCY_CAP = 5`: com três aplicações no semestre,
sobra um piso de risco fixo para todos. A Seção 3.3 já prevê calibração empírica,
então cabe ajustar depois da coleta.

---

## Feito

Anonimato na visão do docente e aviso na tela de feedback. As seis afirmações
literais da Tabela 1. Gráfico do aluno na escala de 1 a 5. Recálculo do risco ao
apagar. Remoção do tema e do código morto. Normalização dos pesos do LIME.
Responsividade com menu em gaveta. Refresh de token por status HTTP, com
single-flight e retry com o token novo. Rate limit no login. Falhas de LIME e
SHAP registradas, com aviso de explicação indisponível. Tooltips próprios.
Loader no cold start. Logout com revogação. Contador no modal de análise. Erro de
exclusão isolado do resto da tela. Rastreabilidade do modelo via
`/versao-modelo`. Comandos de linha para criar usuários e disciplinas.

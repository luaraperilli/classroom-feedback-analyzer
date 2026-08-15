# Pendências

Detalhes em `AUDITORIA.md`, `CONSISTENCIA-ARTIGO-CODIGO.md` e `DECISOES-ORIENTACAO.md`.

---

## 1. Validado em uso

O fluxo do aluno rodou de ponta a ponta com o modelo real: login, envio com
comentário, destaque das palavras pelo LIME, cards de resumo e exclusão.

## 2. Desempenho — resolvido

O gargalo não era o LIME nem o `num_samples=5000`, era o invólucro do
pysentimiento. Cada `sentiment_analyzer.predict()` constrói um `Dataset` do
HuggingFace e roda `.map()`; esse custo fixo dominava, e lotear não adiantava
porque o custo é por lote. As 5.000 perturbações levavam cerca de 99 minutos.

O `_predict_proba` passou a chamar o tokenizador e o modelo diretamente, sob
`torch.inference_mode()`. Mesmo modelo, mesmos pesos: a diferença máxima medida
entre os dois caminhos foi 1,9e-09 — ruído de ponto flutuante. O LIME caiu para
cerca de 9 segundos, ganho de 680x.

**Falta medir em CPU pura.** Esses 9 segundos são com MPS, a GPU do Mac. No
Cloud Run (1 vCPU, sem aceleração) a estimativa é de 40 a 90 segundos, dentro do
timeout de 300s — mas só o primeiro envio em produção confirma.

**Concorrência:** trinta alunos simultâneos numa instância de 1 vCPU se
enfileiram. Subir com `--concurrency 2` e `--max-instances 10` faz o Cloud Run
escalar em vez de empilhar. A conta cabe no free tier com folga: 30 alunos × 3
aplicações × ~60s ≈ 5.400 vCPU-segundos, contra 180.000 mensais gratuitos.

## 3. Ajustes no texto

A Seção 3.1.2 deve dizer que o docente sinaliza o marco **à turma**, e que o
sistema registra a data de cada submissão — o formulário fica sempre aberto, com
o limite diário servindo apenas de proteção contra duplicata.

react-chartjs-2 → recharts na Seção 3.2. Tirar "LIME / SHAP" da caixa do aluno na
Figura 1, que contradiz a própria Seção 3.5. O filtro por intervalos de marcos
citado na 3.5 não existe. SQLite → Postgres na 3.2 e na figura, quando migrarmos.

Na Seção 3.5, a fórmula de opacidade passa a ser **α = 0,2 + |score| × 0,50**,
levando o impacto máximo a **α ≈ 0,70**. O coeficiente caiu de 0,55 junto com a
troca do verde esmeralda pelo teal da marca: sendo mais escuro, em 0,55 o texto
sobre o destaque ficava com contraste 4,34, abaixo do mínimo de 4,5 da WCAG AA.
Em 0,50 volta a 4,76 — a justificativa da fórmula (preservar a legibilidade
sobre fundo branco) é a mesma, só o número muda.

Ainda na 3.5: o `SentimentTrendChart` agora é exclusivo do dashboard docente,
como a 3.2 já dizia. A tela do discente passou a comparar os marcos lado a lado,
sem linha temporal — ligar três pontos mensais por uma linha afirmaria uma
trajetória contínua que não foi medida.

Mais adiante: a subseção do TAM no Método, o TCLE como apêndice e os prints da
Seção 3.5, que só podem ser feitos com o sistema congelado.

## 4. Infraestrutura

Conectar o Supabase, publicar o backend no Cloud Run e o frontend na Vercel.
Medir o `/analyze` em CPU pura no primeiro envio em produção.

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

Predição direta ao modelo, 680x mais rápida que o invólucro do pysentimiento.
Comparação de marcos no lugar da linha temporal na tela do aluno. Teal da marca
como cor do positivo, com o coeficiente de opacidade recalculado para manter o
contraste AA. Toast branco centrado na área de conteúdo, não na janela. Resultado
do envio consumido uma vez, sem reaparecer no reload. Tooltips próprios também
nos cards de resumo.

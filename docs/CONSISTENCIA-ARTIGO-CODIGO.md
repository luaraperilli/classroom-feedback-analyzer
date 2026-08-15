# Consistência entre o artigo e o código

Base: `Artigo_Luara_2026_1_Versão_Final.pdf` (Entregas) × código em `main` (commit `e23ebd6`).
Data: 11/08/2026.

---

## O que confere

Boa parte da Seção 3 descreve o código com precisão, o que é raro. Batem exatamente: as seis afirmações Likert e o mapeamento nas três dimensões de Fredricks (Tabela 1 × `models.py:61-66`), `num_features=10`, `random_state=42`, `class_names=['NEG','NEU','POS']`, o mascarador `shap.maskers.Text(tokenizer=r"\W+")`, `max_evals='auto'`, o compound `s = POS − NEG ∈ [−1,1]`, os 30 termos mais influentes ordenados pelo valor absoluto da média em `/global-shap`, a fórmula de opacidade `α = 0,2 + |score| × 0,55` (`wordHighlight.js:35`), a sequência de processamento (1) predict → (2) LIME → (3) SHAP, e os componentes `ExplainabilityModal` e `ExplainabilityLegend` (existem, dentro de `StudentHistory.js`).

---

## Divergências

### 1. O anonimato descrito no artigo não existe no código

O artigo é explícito, duas vezes. Seção 3.1.1: *"O conteúdo textual e as respostas estruturadas são dissociados do identificador do estudante na visão apresentada ao docente, de modo que o login serve exclusivamente como mecanismo de controle de acesso à turma, sem qualquer vínculo identificável com as respostas analisadas."* Seção 3.2 repete: *"sendo o conteúdo dissociado do identificador do estudante na exibição agregada e na análise pelo docente, em conformidade com o princípio de anonimato adotado neste trabalho."*

O código faz o contrário. `models.py:116` inclui `'student_username': self.student.display_name` em todo `Feedback.to_dict()`, e `Dashboard.js:151` renderiza esse nome ao lado de cada comentário na lista do professor. Ou seja: o docente vê nome e sobrenome colados no comentário livre.

Esta é a divergência mais séria das três: contradiz o método declarado, quebra a promessa feita ao aluno e é exatamente o ponto que a banca tende a cobrar. Também é o que sustenta o piloto do ponto de vista de LGPD.

O ajuste é pequeno e a linha de corte já está definida pelo próprio artigo: tirar a identificação da **lista de feedbacks e do comentário**, e mantê-la nos **cards de risco de evasão** — que a Seção 3.5 justifica expressamente (*"permitindo ao professor priorizar intervenções pedagógicas"*, o que exige saber quem é). Feedback anônimo, painel de risco identificado.

### 2. O "marco didático" não está implementado

A Seção 3.1.2 é categórica: *"Cabe ao docente identificar e sinalizar ao sistema o encerramento de cada marco, liberando o instrumento de coleta para a turma."* Isso é o instrumento de coleta do trabalho.

No código não existe. O que existe é a entidade `Tema`, um rótulo que o **aluno** escolhe ao enviar, e um limite de um feedback por matéria por dia (`routes.py:66-71`). Não há abertura nem fechamento de janela pelo docente: qualquer aluno pode enviar em qualquer dia.

Sem isso, a coleta na turma do professor não segue o desenho descrito. O `Tema` é a base certa — falta dar a ele estado (aberto/encerrado), data de abertura e a ação do docente que libera e encerra.

### 3. Persistência: SQLite no texto, Postgres no deploy

Seção 3.2 e a Figura 1 dizem SQLite. Para o professor aplicar em turma, o SQLite não serve: em hospedagem com filesystem efêmero, todo deploy apaga os feedbacks, e ele serializa escritas (a turma inteira respondendo ao fim da aula é justamente o pior caso).

Vamos para Postgres no Supabase. São duas correções no texto (a frase da Seção 3.2 e o rótulo da camada de persistência na Figura 1).

### 4. A biblioteca de gráficos está trocada

Seção 3.2: *"a aplicação utiliza a biblioteca react-chartjs-2: o componente SentimentTrendChart.js renderiza a evolução longitudinal do sentimento da turma"*. O código usa **recharts** em `SentimentTrendChart.js` e `GlobalShapAnalysis.js` — zero imports de `react-chartjs-2` no projeto inteiro (as três libs `chart.js`, `react-chartjs-2` e `chartjs-plugin-datalabels` estão no `package.json` sem nunca serem usadas).

Aqui o mais simples é corrigir o texto, já que o código funciona: trocar "react-chartjs-2" por "recharts" e remover as dependências órfãs.

### 5. Filtro por marcos didáticos na aba Explicabilidade

Seção 3.5: *"Filtros por disciplina e por intervalos de marcos didáticos permitem ao docente comparar a evolução entre turmas e ao longo do semestre."* O `/global-shap` aceita só `subject_id`; o dashboard filtra por intervalo de datas, não por marco. Depende do item 2 — implementado o marco, o filtro vem junto.

### 6. "Turmas" aparece na arquitetura mas não existe

A Figura 1 lista "Turmas" na camada de persistência e a Seção 3.1.1 fala em "controle de acesso à turma". Não há entidade de turma nem de matrícula: qualquer aluno cadastrado envia feedback para qualquer disciplina, e o cadastro público é aberto à internet.

### 7. O destaque por léxico fixo contradiz a proposta de XAI

`wordHighlight.js:9-22` tem um dicionário fixo de ~40 palavras em português usado quando o feedback não traz atribuições. Combinado com `routes.py:88-95`, que engole falhas do LIME e do SHAP em silêncio, o resultado é: se a explicação falhar, o aluno vê palavras destacadas por regex e lista fixa, na mesma interface que diz que aquelas foram "as palavras que mais pesaram" — e ninguém percebe.

Num trabalho cuja contribuição central é explicabilidade, isso não pode existir. O certo é remover o fallback e mostrar "explicação indisponível" quando não houver atribuição, além de parar de engolir as exceções.

---

## O que o artigo me impediu de fazer (e ainda bem)

Na auditoria anterior eu tinha sugerido **reduzir `num_samples` de 5000 para ~500** para acelerar o LIME. **Retiro a sugestão.** A Seção 3.4 justifica o 5000 explicitamente, citando o padrão da biblioteca (Ribeiro et al., 2016), a validação teórica do regime de convergência para texto (Mardaoui & Garreau, 2021) e os estudos de estabilidade (Zhao et al., 2021; Visani et al., 2022) — *"motivo pelo qual o padrão foi mantido"*. Mexer nisso invalidaria um parágrafo inteiro do método.

A saída correta é outra e já está aplicada: **processar as 5.000 perturbações em lotes**. O gargalo nunca foi o número de amostras, e sim o laço que chamava o modelo uma vez por texto (`services.py:16-28`, batch=1). Em lotes de 32 o resultado é numericamente equivalente e o tempo cai de minutos para dezenas de segundos, sem tocar em nenhum parâmetro descrito no artigo.

---

## Efeito no plano

O que muda: implementar o marco didático passa a ser requisito, não melhoria; a anonimização deixa de ser recomendação e vira correção de divergência; o `num_samples` fica intocado. O que você precisa ajustar no texto é pequeno: SQLite → Postgres (frase + figura) e react-chartjs-2 → recharts.

Vale confirmar com o professor Rodrigo, antes do piloto, se a aplicação em turma real precisa passar pelo CEP e se haverá TCLE — as Seções 4 e 5 ainda estão vazias e é essa coleta do segundo semestre de 2026 que vai preenchê-las.

# Auditoria técnica e plano de deploy — Voz Discente

Data: 11/08/2026 · Escopo: backend Flask (`app/`), frontend React (`frontend/`), viabilidade de deploy gratuito.
Objetivo: colocar o sistema no ar para o professor aplicar em turmas reais.

---

## Resumo

O código está bem mais maduro do que a maioria dos TFGs: arquitetura limpa, papéis separados, política de senha forte, explicabilidade real implementada e o frontend compila sem warnings. O que impede o uso em turma não é qualidade de código, são cinco coisas concretas.

A primeira é que **não existe forma de criar o primeiro coordenador em produção**. O seeder só roda em desenvolvimento, e todas as rotas de `admin.py` exigem um coordenador já logado. O banco nasce vazio e ninguém consegue entrar. Sem resolver isso, o professor literalmente não consegue usar o sistema.

A segunda é o **tempo de resposta do `POST /analyze`**. O LIME roda 5.000 perturbações uma a uma (`services.py:16-28`, sem batching), o que dá de 2,5 a 5 minutos de inferência BERT em CPU, mais 15-30s de SHAP — tudo síncrono dentro da requisição HTTP. Qualquer host corta em 30-100s. Pior: o feedback já foi commitado antes do LIME rodar, então o aluno vê erro de timeout, tenta de novo e leva **409 "já enviou feedback hoje"**. Ele fica sem explicação e bloqueado.

A terceira é **memória**: o processo em regime ocupa 1,1–1,6 GB (torch 250-400 MB, pesos do BERT ~440 MB, shap/pandas/sklearn ~200-320 MB), com pico de ~2 GB no boot. Nenhum free tier de 512 MB aguenta.

A quarta é **persistência**: SQLite em `app/instance/feedback.db`, num filesystem efêmero, significa que todo deploy apaga os feedbacks dos alunos. E `DATABASE_URL` no `.env` é **silenciosamente ignorada** porque `run.py` chama `load_dotenv()` na linha 5, depois do `from app import create_app` da linha 3 — quando `config.py` já leu o ambiente. Você acharia que migrou para Postgres e continuaria gravando em SQLite.

A quinta é o **refresh de token no frontend**: `FeedbackForm.js:206` e `useDashboardData.js:30` testam `err.message.includes('401')`, mas o backend responde com a mensagem em português `"O token de acesso expirou..."`, que não contém "401". A renovação automática nunca dispara. Passada 1h, a sessão morre e só um F5 recupera. E mesmo que o 401 fosse detectado, o retry reusaria o token velho do closure.

Além disso há uma questão que não é de código e precisa de decisão sua e do orientador: **os feedbacks não são anônimos**. `models.py:116` entrega nome e sobrenome do aluno junto do comentário livre para professor e coordenador, e os próprios dados de seed mostram o tipo de conteúdo esperado ("estou desmotivado e pensando em desistir"). Isso é dado pessoal sobre estado emocional, com risco de constrangimento e retaliação, somado a perfilamento automatizado de risco sem aviso nem consentimento. Detalho na seção de LGPD.

---

## P0 — Bloqueadores (o sistema não funciona em turma sem isso)

**1. Bootstrap impossível.** `admin.py` só cria matérias e vincula professores, tudo sob `@requires_role(COORDENADOR)`. O seeder (`__init__.py:62-64`) só roda em desenvolvimento. Falta um comando CLI (`flask create-admin`) ou bootstrap por variável de ambiente, mais rotas para criar professor e pré-cadastrar alunos em lote. O fluxo de `must_change_password` está todo implementado (`auth.py:101-125`), mas o único caminho que cria usuário nesse estado é o seeder de demo.

**2. `load_dotenv()` tarde demais.** `run.py:3-5`. Com `FLASK_CONFIG=production` no `.env`, `SECRET_KEY` e `JWT_SECRET_KEY` chegam como `None` e o boot falha; e `DATABASE_URL` é ignorada em silêncio. Correção de duas linhas, mas é pré-requisito de tudo.

**3. Default de config é `development`.** `__init__.py:42`. Se a variável não for setada no host, o app sobe com `DEBUG=True`, segredos hardcoded, console Werkzeug exposto (RCE remoto) **e o seeder criando `Coordenador/123`, `Professor/123`, `Marina/123` no banco de produção**. O default precisa ser `production`.

**4. `/analyze` síncrono de 3-6 minutos.** Precisa virar job assíncrono (202 + polling) e ter batching real em `_predict_proba` (`sentiment_analyzer.predict(lista)` em vez do laço).

> **Correção após a leitura do artigo:** a versão original deste documento sugeria reduzir `num_samples` de 5000 para ~500. **Sugestão retirada** — a Seção 3.4 do artigo justifica o 5000 com Ribeiro et al. (2016), Mardaoui & Garreau (2021), Zhao et al. (2021) e Visani et al. (2022). O ganho vem só do batching, que é numericamente equivalente. Ver `CONSISTENCIA-ARTIGO-CODIGO.md`.

**5. SQLite + filesystem efêmero.** Migrar para Postgres gerenciado. Junto: as "migrations leves" de `__init__.py:15-39` são ALTER TABLE manuais que rodam em todo boot de todo worker (corrida) e usam `BOOLEAN NOT NULL DEFAULT 0`, sintaxe **inválida no Postgres**.

**6. RAM não cabe em free tier de 512 MB.** Ver seção de deploy.

**7. Refresh de token quebrado + retry com token velho.** `api.js:30-32` precisa propagar `response.status`; `refreshAccessToken()` precisa retornar o novo token para o retry usar.

**8. Sem gunicorn, sem `/health`, sem Dockerfile, sem versões pinadas.** `requirements.txt` são 8 nomes sem `==` — com numpy 2.x, `shap` e `lime` quebram sem aviso (péssimo também para a reprodutibilidade do TFG). `torch` precisa vir do índice CPU-only, senão o wheel tem ~2 GB e estoura o build. `run.py:13` faz bind em `127.0.0.1`, inacessível de dentro de container. `Flask-Bcrypt` está declarado e não é usado.

**9. Sidebar não responsiva.** `App.js:76` usa `w-60 h-screen` fixo, sem nenhuma classe `sm:/md:/lg:` no arquivo inteiro. Num celular de 360px sobram ~120px para o formulário — que é exatamente a tela que os alunos vão usar no celular.

**10. Tela branca no cold start.** `AuthContext.js:123` só renderiza depois do `getProfile`. Com backend hibernando, o aluno vê página em branco por 30-60s sem nenhum loader.

**11. Frontend sem `.env.example` e sem rewrite de SPA.** `REACT_APP_API_BASE_URL` é lida em build time; se não estiver setada no build, o bundle publicado aponta para `localhost:5001`. E sem `vercel.json`, acessar `/historico` direto dá 404.

---

## P1 — Bugs que aparecem no uso real

| # | Local | Problema |
|---|---|---|
| B1 | `routes.py:279-281` | Deletar feedback não recalcula `StudentRiskAnalysis`. Nível de risco fica errado para sempre; se era o último feedback, sobra registro órfão no painel do professor. |
| B2 | `routes.py:55` | `subject_id` nunca é validado. Um POST malformado cria feedback órfão e `models.py:114` passa a estourar `AttributeError` → **`GET /feedbacks` retorna 500 permanentemente**. Um request derruba o dashboard inteiro. |
| B3 | `routes.py:307-324` | `PUT /profile` que só troca a senha **apaga `first_name` e `last_name`**. E `"first_name": null` no JSON dá 500. |
| B4 | `routes.py:66-71` | Limite diário compara datas em UTC. No Brasil o "dia" vira às 21h: quem responde 22h e 23h consegue enviar dois feedbacks. |
| B5 | `AuthContext.js:60` | Após refresh, o user vira `{id, username, role}` e some `must_change_password` → **a tela obrigatória de troca de senha deixa de aparecer**. Some também o `display_name`. |
| B6 | `AuthContext.js:108` | `isAuthenticated = !!accessToken`, nunca checa `exp`. Com token vencido as rotas continuam liberadas e tudo dá 401 numa caixinha vermelha. |
| B7 | `StudentHistory.js:499,620+` | Um erro ao excluir apaga a tela inteira do histórico (tudo está sob `!error`), e o erro nunca é limpo no refetch. |
| B8 | `services.py:26-27` | `except Exception: [0.33,0.34,0.33]` engole qualquer falha do modelo e devolve probabilidade uniforme — LIME/SHAP então produzem explicações plausíveis e **sem sentido**, em silêncio. Grave metodologicamente num TFG sobre XAI. |
| B9 | `routes.py:88-95` | `except Exception: pass` duplo esconde falhas de LIME e SHAP; feedback salvo sem explicação e ninguém sabe. Só `print()`, sem logging. |
| B10 | `models.py:199` | `if self.average_sentiment` — sentimento exatamente 0.0 vira "sem sentimento". |
| B11 | `routes.py:126,130,152` · `:48-51` · `:286-297` | `?start_date=abc` → 500; body `null` → 500; token de usuário removido → 500. Faltam try/except e checagem de `None`. |
| B12 | `RiskAnalysis.js:166` · `wordHighlight.js:36` · `Dashboard.js:136` | Crashes por dado ausente (sem `Array.isArray`, `text.match` sem guarda, `"NaN/5"` na tela). |
| B13 | `ThemeManager.js:127` | Exclusão de tema sem confirmação — um clique acidental e o professor perde o tema. O aluno, ironicamente, tem modal de confirmação. |
| B14 | `api.js:28` | `response.json()` fora do try e antes do check de `ok`: um 502 HTML do proxy vira `SyntaxError: Unexpected token '<'` na cara do usuário. |
| B15 | `Dashboard.js:211,239-263` | Duplo request de `/feedbacks` no mount. |
| B16 | `App.js:138-139` | Usuário logado que vá para `/login` vê o formulário com a sidebar do app ao lado. |

---

## P1 — Segurança

**Sem rate limiting em `/login`** (`auth.py:57`): força bruta livre contra senhas de alunos. **Sem revogação de token**: o `revoked_token_loader` está registrado mas não existe `token_in_blocklist_loader`, então nunca dispara — logout é só `localStorage.removeItem` e um token roubado vale 1h (7 dias no refresh). Trocar a senha não derruba sessões. **`must_change_password` não é imposto no servidor** (`auth.py:82`): o aluno recebe token completo e pode usar todas as rotas sem trocar a senha inicial; a trava é só de UI. **Role vem do JWT** (`decorators.py:10-11`): rebaixar um professor demora até 1h para valer. **`POST /analyze` só exige `@jwt_required()`**: professor e coordenador podem enviar feedback como aluno e poluir a análise de risco. **Sem paginação em `GET /feedbacks`** (`routes.py:104`), devolvendo LIME + SHAP completos de cada feedback: resposta de vários MB e vazamento em massa se um token de professor cair fora. Falta ainda `MAX_CONTENT_LENGTH`, headers de segurança e validação de tamanho de `username`.

**Não existe conceito de turma/matrícula.** Qualquer aluno envia feedback para qualquer matéria, e o cadastro público (`/register`) é aberto à internet inteira, sem convite nem domínio institucional. Para aplicar em turma real, isso precisa existir — senão os dados do professor ficam poluídos e qualquer um lê a lista de matérias.

---

## LGPD — precisa de decisão antes de coletar dado real

Os feedbacks **não são anônimos**: nome e sobrenome vão junto do comentário livre para professor e coordenador. Combinando isso com perfilamento automatizado ("alto risco", `models.py:163-189`), sem aviso ao aluno, sem consentimento registrado, sem finalidade declarada, sem prazo de retenção, sem exclusão de conta, sem portabilidade e sem log de quem leu o quê — o sistema coleta dado sensível sobre estado emocional de estudantes identificados. O art. 20 da LGPD ainda dá ao titular direito a revisão de decisão automatizada, o que hoje não existe.

Recomendação: pseudonimizar o comentário livre (identificar só em agregados e no painel de risco), adicionar TCLE/aviso de privacidade no primeiro acesso e um endpoint para o aluno ver a própria classificação. E confirmar com o orientador se o piloto precisa de aprovação do CEP — aplicar em turma real sem isso é risco institucional, não só jurídico.

---

## Funcionalidades incompletas

Não há um único `TODO` no código, mas faltam: criação de professor/coordenador, pré-cadastro de alunos em lote, modelo de turma/matrícula, "esqueci minha senha" (com login por username e sem e-mail, o professor vira suporte manual), edição/remoção de matéria, logout real, agregação global do LIME (só o SHAP tem `/global-shap`, apesar de o LIME estar armazenado) e testes automatizados (zero arquivos de teste, `pytest` nem está no requirements). Código morto: `getStudentProgress` exportado e nunca usado (o drill-down de aluno no `RiskAnalysis` não clica para lugar nenhum), `getSentimentClass`, `getSentimentMessage`, e `chart.js`/`react-chartjs-2`/`chartjs-plugin-datalabels` no `package.json` sem nenhum import.

Um ponto sensível para a banca: `wordHighlight.js:9-22` tem um **dicionário PT-BR hardcoded de ~40 palavras** usado como fallback quando o backend não manda `token_attributions`. O aluno lê "as palavras que mais pesaram no resultado" achando que é o modelo, quando pode ser regex com lista fixa. Sendo XAI o coração do TFG, ou o fallback some, ou é rotulado explicitamente na interface.

---

## Deploy: o que é realmente gratuito

A restrição que manda em tudo: o backend precisa de **~1,3 GB de RAM** e o job de explicação leva minutos.

O que **não** serve: Vercel (250 MB por função serverless — o torch sozinho não cabe; serve perfeitamente para o frontend), Supabase (é Postgres + auth + storage, não hospeda Python), Render free e Koyeb free (512 MB → OOM no boot), Fly.io free (256 MB), e **Hugging Face Spaces**, que era a melhor aposta gratuita mas passou a exigir plano PRO de US$ 9/mês para hospedar Docker Spaces.

Sobram quatro caminhos:

**A. Google Cloud Run** — free tier de 180.000 vCPU-s e 360.000 GiB-s por mês. Com 2 GiB de memória dá ~50 horas de processamento ativo mensais, e como escala a zero, você só gasta durante as requisições. Para uma ou duas turmas isso cabe folgado no gratuito. Timeout configurável até 60 min, o que resolve o problema do LIME sem reescrever para async. Exige conta GCP com cartão (não cobra dentro do free tier) e um Dockerfile. Cold start de ~40s carregando o modelo.

**B. Oracle Cloud Always Free** — VM ARM com 4 vCPU e 24 GB de RAM, gratuita para sempre, sem hibernar. É de longe o melhor hardware grátis. Em troca você administra um servidor de verdade (systemd, nginx, certificado TLS) e as instâncias ARM vivem esgotadas na região de São Paulo.

**C. Render pago, US$ 7/mês** — 512 MB não bastam, então seria o plano de 2 GB (US$ 25/mês). Caro para o que é.

**D. Aliviar o modelo para caber em 512 MB** — trocar torch por ONNX Runtime com quantização int8 derruba o consumo para ~350-450 MB e acelera a inferência 3-4x, o que faria caber no Render free. Preserva o pysentimiento como modelo, mas muda ligeiramente os números que você já reportou no artigo, e é trabalho de engenharia com risco perto do prazo.

**Recomendação: A (Cloud Run) + Supabase para o Postgres + Vercel para o frontend.** É gratuito de verdade na escala de sala de aula, não exige administrar servidor, e o timeout longo evita reescrever o `/analyze` como job assíncrono agora (embora o batching do LIME valha a pena de qualquer forma — melhora a experiência do aluno de minutos para segundos).

---

## Ordem sugerida

1. `load_dotenv()` antes dos imports, default `production`, falhar sem `CORS_ORIGINS`
2. CLI de bootstrap do coordenador + rotas de criação de professor e alunos
3. Postgres (Supabase) + Alembic, aposentando o SQLite e as migrations manuais
4. Dockerfile + gunicorn + `/health` + requirements pinados com torch CPU-only
5. Batching no `_predict_proba` e `num_samples` para ~500
6. Refresh de token (P0-7), timeout com `AbortController`, loader no boot
7. Sidebar responsiva
8. B2, B1, B3, B5 e rate limit no login
9. Deploy: Cloud Run → Vercel → smoke test ponta a ponta
10. Decisão sobre anonimização e consentimento antes do primeiro dado real

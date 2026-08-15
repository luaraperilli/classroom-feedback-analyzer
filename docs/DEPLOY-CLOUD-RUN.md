# Deploy do backend no Cloud Run

O frontend fica na Vercel (`https://voz-discente.vercel.app`) e o banco no
Supabase. Aqui vai só a API Flask.

## 1. Conta e ferramenta

Crie a conta em `console.cloud.google.com` e ative o faturamento. O cartão serve
para verificação: a cobrança só começa se você clicar em *upgrade to a paid
account* por vontade própria.

Crie um projeto — o nome sugerido é `voz-discente`.

Instale a CLI e autentique:

```bash
brew install --cask google-cloud-sdk
gcloud auth login
gcloud config set project SEU_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

## 2. Liberar o frontend no CORS

Antes de subir, a origem da Vercel precisa entrar no `.env` local — é de lá que
o arquivo de variáveis do Cloud Run é gerado:

```bash
sed -i '' 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://voz-discente.vercel.app|' .env
```

Sem barra no final. A comparação é literal.

## 3. Gerar o arquivo de variáveis

Passar segredo por linha de comando deixa rastro no histórico do shell. O
`cloudrun.env.yaml` é gerado a partir do `.env` e está no `.gitignore`:

```bash
python3 - <<'EOF'
import pathlib
from dotenv import dotenv_values

valores = dotenv_values('.env')
chaves = ('SECRET_KEY', 'JWT_SECRET_KEY', 'CORS_ORIGINS', 'DATABASE_URL')
faltando = [c for c in chaves if not valores.get(c)]
if faltando:
    raise SystemExit(f'faltando no .env: {", ".join(faltando)}')

linhas = ['FLASK_CONFIG: "production"']
linhas += [f'{c}: "{valores[c]}"' for c in chaves]
pathlib.Path('cloudrun.env.yaml').write_text('\n'.join(linhas) + '\n')
print('cloudrun.env.yaml gerado.')
EOF
```

## 4. Subir

```bash
gcloud run deploy voz-discente-api \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 2 \
  --max-instances 10 \
  --env-vars-file cloudrun.env.yaml
```

A primeira build leva de 10 a 15 minutos: ela instala o torch e baixa os pesos
do modelo dentro da imagem. As seguintes reaproveitam as camadas.

Por que cada número:

`--memory 2Gi` porque o modelo ocupa cerca de 1,3 GB. No padrão de 512 MB o
contêiner morre por falta de memória, e o erro não diz isso claramente.

`--cpu 2` porque o LIME é puro processamento; dobrar o núcleo quase divide o
tempo pela metade e o consumo de cota fica equivalente.

`--concurrency 2` porque cada requisição ocupa a CPU inteira. Com o padrão de
80, trinta alunos simultâneos entrariam todos na mesma instância e o último
esperaria a fila inteira. Com 2, o Cloud Run cria instâncias novas.

`--timeout 300` é o teto do serviço e cobre com folga o `/analyze`.

`--region southamerica-east1` fica em São Paulo, perto do Supabase em
`sa-east-1` — cada consulta ao banco atravessa menos rede.

## 5. Apontar o frontend para a API

O deploy imprime a URL, algo como
`https://voz-discente-api-xxxxxxxx.southamerica-east1.run.app`.

Confira que respondeu:

```bash
curl https://SUA-URL/health
```

Na Vercel, em Settings → Environment Variables, troque
`REACT_APP_API_BASE_URL` por essa URL e **refaça o deploy**. A variável é lida
em tempo de build: sem republicar, o site continua apontando para o valor
antigo.

## 6. Popular

O banco é o mesmo Supabase que você já usa localmente, então os usuários e as
disciplinas criados pela linha de comando já estão lá. Para os alunos da turma,
quando o Rodrigo mandar a lista:

```bash
flask --app run.py criar-alunos --arquivo alunos.txt
```

Uma linha por aluno, no formato `matricula;Nome;Sobrenome`.

## Custo

A cota mensal sempre gratuita é de 180.000 vCPU-segundos, 360.000 GiB-segundos e
2 milhões de requisições. O piloto estimado — 30 alunos, 3 aplicações, cerca de
um minuto de processamento cada — consome perto de 5.400 vCPU-segundos com
`--cpu 2`. Fica em torno de 3% da cota.

Vale criar um alerta de orçamento em Billing → Budgets & alerts, com limite de
R$ 1, só para ser avisada caso algo escape do previsto.

Classroom Feedback Analyzer
Uma aplicação web full-stack projetada para coletar feedback de alunos em tempo real e fornecer ao professor uma análise de sentimentos automatizada, ajudando a identificar pontos de melhoria nas aulas.

Sobre o Projeto
Esta ferramenta permite que os alunos enviem comentários anônimos sobre as aulas. O backend, construído com Python e Flask, processa esses comentários usando um modelo de machine learning para análise de sentimentos em português. Os dados são salvos em um banco de dados e apresentados em um dashboard interativo para o professor, que pode visualizar tendências e os principais tópicos mencionados.

Funcionalidades Principais
Submissão Anônima: Alunos podem enviar feedbacks de forma rápida e anônima.

Análise de Sentimentos em Português: Utiliza pysentimiento para uma análise precisa e nativa.

Persistência de Dados: Todos os feedbacks são salvos em um banco de dados SQLite para consulta futura.

API Robusta: Um backend Flask serve os dados e a lógica de análise.

Interface Reativa: Um frontend construído em React para uma experiência de usuário moderna.

Estrutura de Pastas
classroom-feedback-analyzer/
│
├── app/                  # Backend: Código da aplicação Flask
│   ├── instance/         # Backend: Pasta do banco de dados (criada automaticamente)
│   └── main.py           # Backend: Lógica principal e rotas da API
│
├── frontend/             # Frontend: Aplicação React completa
│   ├── src/              # Frontend: Código-fonte (App.js, Dashboard.js, etc.)
│   └── package.json      # Frontend: Lista de dependências JavaScript
│
├── venv/                 # Ambiente virtual Python
│
├── .gitignore            # Arquivos e pastas a serem ignorados pelo Git
├── README.md             # Esta documentação
└── requirements.txt      # Lista de dependências Python

Tecnologias Utilizadas
Backend: Python, Flask, Flask-SQLAlchemy, pysentimiento

Frontend: React.js, JavaScript, CSS

Banco de Dados: SQLite

Como Executar
Pré-requisitos: Python 3.10+, Node.js e npm

1. Clone o Repositório

git clone [URL_DO_SEU_REPOSITORIO]
cd classroom-feedback-analyzer

2. Configure o Backend

python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

3. Inicialize o Banco de Dados (Passo Único)

python -m flask --app app/main shell
# Dentro do shell (>>>), execute:
# from main import db
# db.create_all()
# exit()

4. Configure o Frontend

cd frontend
npm install

5. Rode a Aplicação Completa

# Dentro da pasta 'frontend', execute:
npm run dev

A aplicação estará disponível em http://localhost:3000.

Rotas da API
POST /analyze

Recebe um JSON com o feedback do aluno. Ex: {"text": "A aula foi muito boa!"}

Salva no banco de dados e retorna a análise de sentimento.

GET /feedbacks

Retorna uma lista de todos os feedbacks salvos, usada pelo Dashboard do Professor.
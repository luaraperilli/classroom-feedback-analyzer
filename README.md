# 📊 Classroom Feedback Analyzer

Uma aplicação web full-stack projetada para coletar feedback de alunos em tempo real e fornecer ao professor uma análise de sentimentos automatizada, ajudando a identificar pontos de melhoria nas aulas.

## 🚀 Sobre o Projeto

Esta ferramenta permite que os alunos enviem comentários **anônimos** sobre as aulas. O backend, construído com **Python e Flask**, processa esses comentários usando um modelo de machine learning para análise de sentimentos em português.

Os dados são salvos em um **banco de dados SQLite** e apresentados em um **dashboard interativo** para o professor, que pode visualizar tendências, os principais tópicos mencionados e insights valiosos sobre a percepção da turma.

## ✨ Funcionalidades Principais

-   📝 **Página de Submissão Anônima**: Alunos podem enviar feedbacks de forma rápida e anônima.
-   🤖 **Análise de Sentimentos em Português**: Utiliza a biblioteca `pysentimiento` para uma análise precisa e nativa da língua portuguesa.
-   💾 **Persistência de Dados**: Todos os feedbacks são salvos em um banco de dados **SQLite**, com o schema sendo criado automaticamente na inicialização.
-   📈 **Dashboard Interativo para o Professor**: Uma interface rica construída em **React** que apresenta:
    -   **Cartões de Resumo**: Visão geral e rápida com a contagem e percentagem de feedbacks positivos, neutros e negativos.
    -   **Gráfico de Tendência**: Um gráfico de barras que mostra a evolução dos sentimentos ao longo dos dias.
    -   **Lista de Feedbacks Recentes**: Acesso direto aos comentários mais recentes, com indicadores visuais de sentimento.
-   ⚙️ **API Robusta**: Um backend **Flask** com endpoints para analisar, listar feedbacks e gerar palavras-chave.

## 🛠️ Tecnologias Utilizadas

#### **Backend**
-   Python
-   Flask
-   Flask-SQLAlchemy (para ORM com SQLite)
-   Flask-CORS (para permitir a comunicação com o frontend)
-   [pysentimiento](https://github.com/pysentimiento/pysentimiento) (para Análise de Sentimento)
-   NLTK (para processamento de texto)

#### **Frontend**
-   React.js
-   React Router (para navegação entre páginas)
-   Chart.js & react-chartjs-2 (para visualização de dados)
-   CSS moderno para estilização

#### **Banco de Dados**
-   SQLite

#### **Ambiente de Desenvolvimento**
-   Concurrently (para executar servidores de backend e frontend com um único comando)

## 📂 Estrutura de Pastas
* `classroom-feedback-analyzer/`
    * `app/` - Código da aplicação Flask (backend)
        * `__init__.py` - Criação da aplicação Flask e configuração do DB.
        * `models.py` - Definição do modelo de dados do Feedback.
        * `routes.py` - Endpoints da API (`/analyze`, `/feedbacks`).
        * `services.py` - Lógica de negócio (análise de sentimento, etc.).
    * `instance/` - Contém o ficheiro do banco de dados `feedback.db`.
    * `frontend/` - Aplicação React (frontend)
        * `public/` - Arquivos estáticos.
        * `src/` - Código-fonte dos componentes React.
        * `package.json` - Dependências e scripts do frontend.
    * `venv/` - Ambiente virtual Python.
    * `run.py` - Ponto de entrada para iniciar o servidor Flask.
    * `requirements.txt` - Dependências Python.
    * `README.md` - Esta documentação.

## ▶️ Como Executar o Projeto

### 📌 Pré-requisitos
-   Python **3.10+**
-   Node.js e npm

### 1. Clone o Repositório
```bash
git clone [https://github.com/luaraperilli/classroom-feedback-analyzer]
cd classroom-feedback-analyzer
```

### 2. Configure o Backend
```bash
# Criar o ambiente virtual
python -m venv venv

# Ativar (escolha o comando para o seu sistema)
.\venv\Scripts\activate    # Windows
source venv/bin/activate   # Linux/Mac

# Instalar as dependências
pip install -r requirements.txt
```

### 3. Inicialize o Banco de Dados
```bash
python -m flask --app app/main shell
from main import db
db.create_all()
exit()
```

### 4. Configure o Frontend
```bash
cd frontend
npm install
```

### 5. Inicie a Aplicação
```bash
# Este comando iniciará o servidor do React e o servidor do Flask simultaneamente
cd frontend
npm run dev
```

A aplicação estará disponível em:
http://localhost:3000

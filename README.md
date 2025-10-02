# 📊 Classroom Feedback Analyzer

Uma aplicação web full-stack projetada para coletar feedback de alunos em tempo real e fornecer a professores e coordenadores uma análise de sentimentos automatizada, ajudando a identificar pontos de melhoria nas aulas.

## 🚀 Sobre o Projeto

Esta ferramenta permite que os alunos enviem comentários sobre as aulas de forma anônima. O backend, construído com **Python e Flask**, processa esses comentários usando um modelo de machine learning para análise de sentimentos em português.

Os dados são salvos em um **banco de dados SQLite** e apresentados em um **dashboard interativo** para o professor ou coordenador, que pode visualizar tendências, filtrar por matéria e período, e obter insights valiosos sobre a percepção da turma. A aplicação também conta com um sistema de usuários baseado em papéis (aluno, professor, coordenador) com funcionalidades específicas para cada um.

## ✨ Funcionalidades Principais

-   👤 **Autenticação e Papéis**: Sistema de usuários com papéis distintos para Alunos, Professores e Coordenadores.
-   📝 **Página de Submissão Anônima**: Alunos podem enviar feedbacks de forma rápida e anônima após o login.
-   🤖 **Análise de Sentimentos em Português**: Utiliza a biblioteca `pysentimiento` para uma análise precisa e nativa da língua portuguesa.
-   💾 **Persistência de Dados**: Todos os feedbacks são salvos em um banco de dados **SQLite**, com o schema e dados iniciais sendo criados automaticamente na inicialização.
-   📈 **Dashboard Interativo**: Uma interface rica construída em **React** que apresenta:
    -   **Cartões de Resumo**: Visão geral com a contagem e percentagem de feedbacks positivos, neutros e negativos.
    -   **Gráfico de Tendência**: Um gráfico de linha que mostra a evolução dos sentimentos ao longo do tempo.
    -   **Lista de Feedbacks Recentes**: Acesso direto aos comentários mais recentes, com indicadores visuais de sentimento.
    -   **Filtros**: Capacidade de filtrar feedbacks por matéria e período de tempo.
-   🔒 **Rotas Protegidas**: O acesso às diferentes páginas é controlado com base no papel do usuário.
-   👑 **Área de Gestão do Coordenador**: Uma página dedicada para coordenadores para:
    -   Criar novas matérias.
    -   Vincular matérias a professores.
-   ⚙️ **API Robusta**: Um backend **Flask** com endpoints para analisar e listar feedbacks, gerenciar matérias e lidar com a autenticação de usuários via JWT.

## 🛠️ Tecnologias Utilizadas

#### **Backend**
-   Python
-   Flask
-   Flask-SQLAlchemy (ORM)
-   Flask-CORS
-   Flask-JWT-Extended (Autenticação)
-   Flask-Bcrypt (Hashing de Senhas)
-   [pysentimiento](https://github.com/pysentimiento/pysentimiento) (Análise de Sentimento)

#### **Frontend**
-   React.js
-   React Router (Navegação)
-   Chart.js & react-chartjs-2 (Visualização de Dados)
-   jwt-decode (Decodificação de Tokens JWT)
-   CSS moderno para estilização

#### **Banco de Dados**
-   SQLite

#### **Ambiente de Desenvolvimento**
-   Concurrently (para executar servidores de backend e frontend com um único comando)

## 📂 Estrutura de Pastas
* `classroom-feedback-analyzer/`
    * `app/` - Código da aplicação Flask (backend)
        * `__init__.py` - Criação da aplicação Flask e configuração.
        * `models.py` - Modelos de dados (User, Subject, Feedback).
        * `routes.py` - Endpoints da API (`/analyze`, `/feedbacks`, etc.).
        * `services.py` - Lógica de negócio (análise de sentimento).
        * `auth.py` - Endpoints de autenticação (`/login`, `/register`).
        * `admin.py` - Endpoints de administração para coordenadores.
        * `seeder.py` - Script para popular o banco de dados inicial.
        * `instance/` - Contém o arquivo do banco de dados `feedback.db`.
    * `frontend/` - Aplicação React (frontend)
        * `public/` - Arquivos estáticos.
        * `src/` - Código-fonte dos componentes React.
            * `components/` - Componentes reutilizáveis (gráficos, etc.).
            * `features/` - Lógica e componentes de cada funcionalidade.
            * `services/` - Funções de chamada à API.
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

## 👤 Contas de Exemplo
Após iniciar o projeto, é possível utilizar as seguintes credenciais para teste (considere que a senha é 123):

- Aluno: student
- Professor: professor
- Coordenador: coordinator

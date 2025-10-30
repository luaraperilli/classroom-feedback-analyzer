# 📊 Classroom Feedback Analyzer

Uma aplicação web full-stack projetada para coletar feedback estruturado de alunos em tempo real e fornecer a professores e coordenadores uma análise de sentimentos automatizada com detecção de risco de evasão, ajudando a identificar pontos de melhoria nas aulas e alunos que necessitam de atenção especial.

## 🚀 Sobre o Projeto

Esta ferramenta permite que os alunos avaliem o seu próprio engajamento através de um sistema de avaliação estruturado (escala de 1 a 5). O backend, construído com Python e Flask, processa essas avaliações e comentários obrigatórios usando um modelo de machine learning para análise de sentimentos em português.

Os dados são salvos em um banco de dados SQLite e apresentados em um dashboard interativo para o professor ou coordenador, que pode visualizar tendências, filtrar por matéria e período, e obter perceções valiosas sobre a turma. A aplicação também conta com um sistema de análise de risco de evasão que identifica alunos que podem precisar de suporte adicional, baseado em múltiplos indicadores de desempenho e satisfação.

## ✨ Funcionalidades Principais

### 👤 Sistema de Autenticação e Papéis
- Sistema de usuários com papéis distintos para Alunos, Professores e Coordenadores.
- Autenticação segura com JWT (JSON Web Tokens).
- Controle de acesso baseado em permissões.

### 📝 Feedback Estruturado dos Alunos
O aluno fornece feedback com base em 6 perguntas de autoavaliação, divididas em 3 pilares, usando uma escala de 1 (Muito Insatisfeito) a 5 (Muito Satisfeito):

- Pilar Comportamental:
  - “Participo ativamente das aulas e atividades propostas pelo professor.”
  - “Cumpro as tarefas e prazos estabelecidos na disciplina com regularidade.”

- Pilar Emocional:
  - “Sinto-me motivado(a) e interessado(a) pelos conteúdos trabalhados nesta disciplina.”
  - “Sinto que o ambiente de aula é acolhedor e me estimula a continuar participando.”

- Pilar Cognitivo:
  - “Dedico tempo e esforço para compreender os conceitos apresentados em aula.”
  - “Consigo relacionar os conteúdos desta disciplina com situações práticas ou outras matérias.”

- Comentário:
  - O aluno deve fornecer um comentário por escrito para justificar as suas avaliações.

### 🤖 Análise de Sentimentos em Português
- Utiliza a biblioteca `pysentimiento` para análise precisa em português.
- Análise automática dos comentários.
- Cálculo de score composto (positivo, neutro, negativo).

### 🎯 Sistema de Análise de Risco de Evasão
- Cálculo Automático de Risco baseado em:
  - Score médio das avaliações estruturadas (peso: 50%)
  - Sentimento médio dos comentários (peso: 30%)
  - Consistência/frequência de feedbacks (peso: 20%)

- Classificação em 3 Níveis:
  - 🚨 Alto Risco (≥ 60%)
  - ⚠️ Risco Moderado (30-59%)
  - ✅ Baixo Risco (< 30%)

- Dashboard de Risco com:
  - Cards de resumo por nível de risco
  - Lista detalhada de alunos em risco
  - Métricas individuais por aluno/matéria
  - Filtros por matéria e nível mínimo de risco

- Atualização Automática: O risco é recalculado a cada novo feedback.

### 👑 Área de Gestão do Coordenador
- Criar novas matérias.
- Vincular matérias a professores.
- Visualizar todos os professores cadastrados.
- Acesso total ao sistema de análise de risco.

### ⚙️ API REST
- Endpoints para análise e listagem de feedbacks
- Gerenciamento de matérias e usuários
- Autenticação via JWT
- Sistema de análise de risco com endpoints dedicados

## 🛠️ Tecnologias Utilizadas

#### Backend
- Python 3.10+
- Flask
- Flask-SQLAlchemy (ORM)
- Flask-CORS
- Flask-JWT-Extended (Autenticação)
- Werkzeug (Hashing de Senhas)
- [pysentimiento](https://github.com/pysentimiento/pysentimiento) (Análise de Sentimento)

#### Frontend
- React.js
- React Router (Navegação)
- Chart.js & react-chartjs-2 (Visualização de Dados)
- jwt-decode (Decodificação de Tokens JWT)
- CSS3 moderno com variáveis e animações

#### Banco de Dados
- SQLite com 4 tabelas principais:
  - `User` - Usuários do sistema
  - `Subject` - Matérias/disciplinas
  - `Feedback` - Avaliações estruturadas dos alunos
  - `StudentRiskAnalysis` - Análise de risco de evasão

#### Ambiente de Desenvolvimento
- Concurrently (execução simultânea de servidores)

## 📂 Estrutura de Pastas
```
classroom-feedback-analyzer/
├── app/                        # Backend Flask
│   ├── __init__.py            # Configuração da aplicação
│   ├── models.py              # Modelos de dados (User, Subject, Feedback, StudentRiskAnalysis)
│   ├── routes.py              # Endpoints da API
│   ├── services.py            # Lógica de análise de sentimento e risco
│   ├── auth.py                # Autenticação (login, register)
│   ├── admin.py               # Endpoints administrativos
│   └── seeder.py              # Dados iniciais do banco
├── frontend/                   # Frontend React
│   ├── public/                # Arquivos estáticos
│   └── src/
│       ├── components/        # Componentes reutilizáveis
│       │   ├── SentimentSummary.js
│       │   └── SentimentTrendChart.js
│       ├── features/          # Funcionalidades por módulo
│       │   ├── auth/          # Autenticação
│       │   ├── feedback/      # Formulário estruturado
│       │   ├── dashboard/     # Dashboard e análise de risco
│       │   └── coordinator/   # Área do coordenador
│       ├── services/          # API calls
│       └── utils/             # Utilitários (traduções, etc.)
├── venv/                      # Ambiente virtual Python
├── run.py                     # Inicialização do Flask
├── config.py                  # Configurações da aplicação
├── requirements.txt           # Dependências Python
└── README.md                  # Documentação
```

## ▶️ Como Executar o Projeto

### 📌 Pré-requisitos
- Python **3.10+**
- Node.js **14+** e npm

### 1️⃣ Clone o Repositório
```bash
git clone https://github.com/luaraperilli/classroom-feedback-analyzer
cd classroom-feedback-analyzer
```

### 2️⃣ Configure o Backend
```bash
# Criar o ambiente virtual
python -m venv venv

# Ativar
.\venv\Scripts\activate    # Windows
source venv/bin/activate   # Linux/Mac

# Instalar as dependências
pip install -r requirements.txt
```

### 3️⃣ Inicialize o Banco de Dados
```bash
# O banco de dados será criado automaticamente ao iniciar a aplicação
# Incluindo dados de exemplo (usuários, matérias e feedbacks)
python run.py
```

### 4️⃣ Configure o Frontend
```bash
cd frontend
npm install
```

### 5️⃣ Inicie a Aplicação
```bash
# Opção 1: Executar ambos os servidores simultaneamente
cd frontend
npm run dev

# Opção 2: Executar separadamente
# Terminal 1 - Backend:
python run.py

# Terminal 2 - Frontend:
cd frontend
npm start
```

A aplicação estará disponível em:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 👤 Contas de Teste

Após iniciar o projeto, utilize as seguintes credenciais (senha: `123`):

| Usuário      | Papel       | Acesso                                      |
|--------------|-------------|---------------------------------------------|
| `student1`   | Aluno       | Baixo risco - Feedbacks positivos           |
| `student2`   | Aluno       | Baixo risco - Feedbacks positivos           |
| `student3`   | Aluno       | Médio variado - Feedbacks moderados         |
| `student4`   | Aluno       | Médio variado - Feedbacks moderados         |
| `student5`   | Aluno       | Alto variado - Feedbacks negativos          |
| `student6`   | Aluno       | Alto variado - Feedbacks negativos          |
| `professor`  | Professor   | Dashboard + Análise de Risco (suas matérias)|
| `coordinator`| Coordenador | Dashboard + Análise de Risco + Gestão       |

## 📊 Entendendo o Sistema de Risco

### Como é Calculado?
O score de risco (0-100%) é calculado através de uma fórmula ponderada:

```
Risk Score = (Score_Risk × 0.5) + (Sentiment_Risk × 0.3) + (Consistency_Risk × 0.2)
```

Onde:
- Score_Risk: Invertido da média das avaliações (baixas notas = alto risco)
- Sentiment_Risk: Baseado no sentimento dos comentários
- Consistency_Risk: Relacionado à quantidade de feedbacks (poucos = incerteza)

### Classificação de Risco:
- 🚨 Alto Risco (≥60%): Aluno precisa de atenção imediata
- ⚠️ Médio Risco (30-59%): Aluno pode precisar de suporte
- ✅ Baixo Risco (<30%): Aluno engajado e satisfeito

## 🙏 Agradecimentos

- Biblioteca [pysentimiento](https://github.com/pysentimiento/pysentimiento) pela análise de sentimentos
- Comunidade React e Flask

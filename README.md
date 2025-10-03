# 📊 Classroom Feedback Analyzer

Uma aplicação web full-stack projetada para coletar feedback estruturado de alunos em tempo real e fornecer a professores e coordenadores uma análise de sentimentos automatizada com detecção de risco de evasão, ajudando a identificar pontos de melhoria nas aulas e alunos que necessitam de atenção especial.

## 🚀 Sobre o Projeto

Esta ferramenta permite que os alunos avaliem diversos aspectos das aulas através de um sistema de avaliação estruturado (escala de 1 a 5). O backend, construído com Python e Flask, processa essas avaliações e comentários opcionais usando um modelo de machine learning para análise de sentimentos em português.

Os dados são salvos em um banco de dados SQLite e apresentados em um dashboard interativo para o professor ou coordenador, que pode visualizar tendências, filtrar por matéria e período, e obter conhecimentos valiosos sobre a percepção da turma. A aplicação também conta com um sistema de análise de risco de evasão que identifica alunos que podem precisar de suporte adicional, baseado em múltiplos indicadores de desempenho e satisfação.

## ✨ Funcionalidades Principais

### 👤 Sistema de Autenticação e Papéis
- Sistema de usuários com papéis distintos para Alunos, Professores e Coordenadores
- Autenticação segura com JWT (JSON Web Tokens)
- Controle de acesso baseado em permissões

### 📝 Feedback Estruturado dos Alunos
- 5 Perguntas de Avaliação com escala de 1 a 5:
  - 📚 Qualidade do material didático
  - 👨‍🏫 Didática do professor
  - 🧠 Compreensão do conteúdo
  - ⏱️ Ritmo da aula
  - 💡 Qualidade dos exemplos práticos
- Comentário adicional opcional para feedback mais detalhado
- Interface visual intuitiva com botões de seleção
- Feedback em tempo real da avaliação média
- Animação de sucesso ao enviar

### 🤖 Análise de Sentimentos em Português
- Utiliza a biblioteca `pysentimiento` para análise precisa em português
- Análise automática dos comentários opcionais
- Cálculo de score composto (positivo, neutro, negativo)

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
- Atualização Automática: O risco é recalculado a cada novo feedback

### 💾 Persistência de Dados
- Todos os feedbacks são salvos em banco de dados SQLite
- Schema e dados iniciais criados automaticamente
- Histórico completo de avaliações por aluno

### 📈 Dashboard Interativo para Professores/Coordenadores
- Aba de Feedbacks:
  - Cartões de Resumo: Visão geral com contagem e percentagem de feedbacks positivos, neutros e negativos
  - Gráfico de Tendência: Evolução dos sentimentos ao longo do tempo
  - Lista Detalhada: Feedbacks recentes com todas as avaliações estruturadas
  - Filtros: Por matéria e período de tempo
- Aba de Análise de Risco:
  - Identificação visual de alunos em risco
  - Métricas detalhadas por aluno
  - Filtros personalizáveis
  - Alertas de atenção

### 🔒 Rotas Protegidas
- Acesso controlado baseado no papel do usuário
- Professores só visualizam suas matérias
- Coordenadores têm acesso completo

### 👑 Área de Gestão do Coordenador
- Criar novas matérias
- Vincular matérias a professores
- Visualizar todos os professores cadastrados
- Acesso total ao sistema de análise de risco

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
| `student2`   | Aluno       | Médio risco - Feedbacks moderados           |
| `student3`   | Aluno       | Alto risco - Feedbacks negativos            |
| `student4`   | Aluno       | Risco variado - Feedbacks mistos            |
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

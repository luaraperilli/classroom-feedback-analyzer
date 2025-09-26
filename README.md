# 📊 Classroom Feedback Analyzer

Uma aplicação **web full-stack** projetada para coletar feedback de alunos em tempo real e fornecer ao professor uma **análise de sentimentos automatizada**, ajudando a identificar pontos de melhoria nas aulas.

---

## 🚀 Sobre o Projeto

Esta ferramenta permite que os alunos enviem comentários **anônimos** sobre as aulas.  
O backend, construído com **Python e Flask**, processa esses comentários usando um modelo de **machine learning** para análise de sentimentos em português.  

Os dados são salvos em um **banco de dados** e apresentados em um **dashboard interativo** para o professor, que pode visualizar tendências e os principais tópicos mencionados.

---

## ✨ Funcionalidades Principais

- 📝 **Submissão Anônima**: alunos podem enviar feedbacks de forma rápida e anônima.  
- 🤖 **Análise de Sentimentos em Português**: utiliza [pysentimiento](https://github.com/pysentimiento/pysentimiento) para uma análise precisa e nativa.  
- 💾 **Persistência de Dados**: todos os feedbacks são salvos em um banco de dados **SQLite** para consulta futura.  
- ⚙️ **API Robusta**: um backend **Flask** serve os dados e a lógica de análise.  
- 💻 **Interface Reativa**: um frontend construído em **React** para uma experiência moderna.  

---

## 📂 Estrutura de Pastas
* `classroom-feedback-analyzer/`
    * `app/` - Backend: Código da aplicação Flask
    * `instance/` - Backend: Banco de dados
    * `main.py` - Backend: Lógica principal e rotas da API
    * `frontend/` - Frontend: Aplicação React
        * `src/` - Código-fonte (App.js, Dashboard.js, etc.)
        * `package.json` - Dependências JavaScript
    * `venv/` - Ambiente virtual Python
    * `.gitignore` - Arquivos/pastas ignorados pelo Git
    * `README.md` - Documentação
    * `requirements.txt` - Dependências Python

---

## 🛠️ Tecnologias Utilizadas

**Backend**  
- Python  
- Flask  
- Flask-SQLAlchemy  
- [pysentimiento](https://github.com/pysentimiento/pysentimiento)  

**Frontend**  
- React.js  
- JavaScript  
- CSS  

**Banco de Dados**  
- SQLite  

---

## ▶️ Como Executar

### 📌 Pré-requisitos
- Python **3.10+**  
- Node.js e npm  

---

### 1. Clone o Repositório
```bash
git clone https://github.com/luaraperilli/classroom-feedback-analyzer
cd classroom-feedback-analyzer
```

### 2. Configure o Backend
```bash
python -m venv venv
.\venv\Scripts\activate    # Windows
source venv/bin/activate   # Linux/Mac
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
Dentro da pasta frontend:
```bash
npm run dev
```

A aplicação estará disponível em:
http://localhost:3000

from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from .models import db, User, Subject, Feedback
from .services import analyze_sentiment_text

def seed_all():
    if User.query.first() is None:
        print("Populando o banco de dados com dados iniciais...")
        seed_users()
        seed_subjects()
        seed_feedbacks()
        print("Banco de dados populado com sucesso.")

def seed_users():
    hashed_password = generate_password_hash("123", method="pbkdf2:sha256")

    coordinator = User(username="coordinator", password=hashed_password, role=User.COORDENADOR)
    professor = User(username="professor", password=hashed_password, role=User.PROFESSOR)
    student = User(username="student", password=hashed_password, role=User.ALUNO)

    db.session.add_all([coordinator, professor, student])
    db.session.commit()

def seed_subjects():
    data_structures = Subject(name="Data Structures")
    database_systems = Subject(name="Database Systems")
    software_engineering = Subject(name="Software Engineering")
    computer_networks = Subject(name="Computer Networks")
    information_security = Subject(name="Information Security")

    db.session.add_all([
        data_structures, 
        database_systems, 
        software_engineering, 
        computer_networks, 
        information_security
    ])
    db.session.commit()

    professor = User.query.filter_by(role=User.PROFESSOR).first()
    if professor:
        professor.subjects.append(data_structures)
        professor.subjects.append(database_systems)
        professor.subjects.append(software_engineering)
        db.session.commit()

def seed_feedbacks():
    now = datetime.utcnow()
    
    feedbacks_data = [
        {"subject_name": "Data Structures", "text": "A aula sobre listas ligadas foi muito clara e os exemplos ajudaram bastante a entender a matéria.", "created_at": now - timedelta(days=1)},
        {"subject_name": "Data Structures", "text": "Achei o ritmo da aula um pouco rápido demais. Tive dificuldade para acompanhar o final.", "created_at": now - timedelta(days=2)},
        {"subject_name": "Database Systems", "text": "Gostei muito da explicação sobre normalização de banco de dados, finalmente entendi a diferença entre as formas normais.", "created_at": now - timedelta(days=3)},
        {"subject_name": "Software Engineering", "text": "A aula foi ok, mas poderia ter mais exemplos práticos de como aplicar os conceitos no dia a dia.", "created_at": now - timedelta(days=4)},
        {"subject_name": "Database Systems", "text": "O professor explicou muito bem o conteúdo, mas o material de apoio poderia ser melhor.", "created_at": now - timedelta(days=8)},
        {"subject_name": "Data Structures", "text": "O exercício proposto foi muito desafiador, mas consegui aprender muito ao resolvê-lo.", "created_at": now - timedelta(days=10)},
        {"subject_name": "Software Engineering", "text": "Não gostei da aula de hoje, achei o tema muito abstrato e a explicação não ajudou a clarear.", "created_at": now - timedelta(days=12)},
        {"subject_name": "Computer Networks", "text": "Excelente introdução ao modelo OSI. Muito bem explicado.", "created_at": now - timedelta(days=15)},
        {"subject_name": "Data Structures", "text": "A aula sobre árvores binárias foi fantástica!", "created_at": now - timedelta(days=20)},
        {"subject_name": "Database Systems", "text": "O tópico de SQL Injection foi muito relevante e apresentado de forma prática.", "created_at": now - timedelta(days=25)},
        {"subject_name": "Software Engineering", "text": "Gostaria de mais discussões sobre metodologias ágeis.", "created_at": now - timedelta(days=35)},
    ]

    for feedback_info in feedbacks_data:
        subject = Subject.query.filter_by(name=feedback_info["subject_name"]).first()
        if subject:
            sentiment_scores = analyze_sentiment_text(feedback_info["text"])
            
            new_feedback = Feedback(
                text=feedback_info["text"],
                subject_id=subject.id,
                compound=sentiment_scores["compound"],
                neg=sentiment_scores["neg"],
                neu=sentiment_scores["neu"],
                pos=sentiment_scores["pos"],
                created_at=feedback_info["created_at"]
            )
            db.session.add(new_feedback)
            
    db.session.commit()
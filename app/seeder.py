from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from .models import db, User, Subject, Feedback
from .services import create_feedback
import random

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
    
    students = [
        User(username="student1", password=hashed_password, role=User.ALUNO),
        User(username="student2", password=hashed_password, role=User.ALUNO),
        User(username="student3", password=hashed_password, role=User.ALUNO),
        User(username="student4", password=hashed_password, role=User.ALUNO),
    ]

    db.session.add_all([coordinator, professor] + students)
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
    
    students = User.query.filter_by(role=User.ALUNO).all()
    subjects = Subject.query.filter(Subject.name.in_([
        'Data Structures', 
        'Database Systems', 
        'Software Engineering'
    ])).all()
    
    if not students or not subjects:
        return
    
    student_profiles = {
        'student1': 'satisfeito',
        'student2': 'moderado', 
        'student3': 'insatisfeito',
        'student4': 'variado',
    }
    
    comments = {
        'satisfeito': [
            "Adorei a aula de hoje! Muito bem explicado.",
            "O professor é excelente, consegui entender tudo.",
            "Material muito bom e aula dinâmica.",
            "Estou aprendendo muito nesta disciplina.",
        ],
        'moderado': [
            "A aula foi ok, mas alguns pontos ficaram confusos.",
            "Entendi a maior parte, mas preciso revisar alguns conceitos.",
            "Bom conteúdo, mas o ritmo estava rápido.",
            "Material interessante, porém poderia ter mais exemplos.",
        ],
        'insatisfeito': [
            "Não consegui acompanhar a explicação.",
            "Achei muito difícil e não entendi quase nada.",
            "O material não ajudou muito.",
            "Estou com muita dificuldade nesta matéria.",
        ],
        'variado': [
            "Aula boa, mas poderia melhorar.",
            "Alguns pontos foram claros, outros não.",
            "Gostei da primeira parte, mas a segunda ficou confusa.",
            "Material ok, explicação poderia ser melhor.",
        ]
    }
    
    for student in students:
        profile = student_profiles.get(student.username, 'moderado')
        
        num_feedbacks = {
            'satisfeito': random.randint(5, 8),
            'moderado': random.randint(3, 6),
            'insatisfeito': random.randint(2, 4),
            'variado': random.randint(4, 7)
        }
        
        for i in range(num_feedbacks[profile]):
            subject = random.choice(subjects)
            days_ago = random.randint(1, 30)
            created_date = now - timedelta(days=days_ago)
            
            if profile == 'satisfeito':
                base_scores = [4, 5]
            elif profile == 'moderado':
                base_scores = [3, 4]
            elif profile == 'insatisfeito':
                base_scores = [1, 2, 3]
            else:
                base_scores = [2, 3, 4]
            
            answers = {
                'material_quality': random.choice(base_scores),
                'teaching_method': random.choice(base_scores),
                'content_understanding': random.choice(base_scores),
                'class_pace': random.choice(base_scores),
                'practical_examples': random.choice(base_scores)
            }
            
            comment = None
            if random.random() < 0.7:
                comment = random.choice(comments[profile])
            
            feedback = Feedback(
                student_id=student.id,
                subject_id=subject.id,
                material_quality=answers['material_quality'],
                teaching_method=answers['teaching_method'],
                content_understanding=answers['content_understanding'],
                class_pace=answers['class_pace'],
                practical_examples=answers['practical_examples'],
                additional_comment=comment,
                created_at=created_date
            )
            
            feedback.overall_score = feedback.calculate_overall_score()
            
            if comment:
                from .services import analyze_sentiment_text
                sentiment = analyze_sentiment_text(comment)
                if sentiment:
                    feedback.compound = sentiment['compound']
                    feedback.neg = sentiment['neg']
                    feedback.neu = sentiment['neu']
                    feedback.pos = sentiment['pos']
            
            db.session.add(feedback)
    
    db.session.commit()
    
    from .services import update_student_risk_analysis
    for student in students:
        for subject in subjects:
            update_student_risk_analysis(student.id, subject.id)
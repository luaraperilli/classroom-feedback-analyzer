from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from .models import db, User, Subject, Feedback, StudentRiskAnalysis
from .services import analyze_sentiment_text
import random
import re

def seed_all():
    if User.query.first() is None:
        seed_users()
        seed_subjects()
        seed_feedbacks()
        print("Banco de dados populado com sucesso.")
    else:
        print("Banco de dados já populado.")

def seed_users():
    hashed_password = generate_password_hash("123", method="pbkdf2:sha256")

    coordinator = User(username="coordinator", password=hashed_password, role=User.COORDENADOR)
    professor = User(username="professor", password=hashed_password, role=User.PROFESSOR)
    
    db.session.add_all([coordinator, professor])
    
    # 2 Alunos de Baixo Risco
    db.session.add(User(username="student1", password=hashed_password, role=User.ALUNO))
    db.session.add(User(username="student2", password=hashed_password, role=User.ALUNO))

    # 2 Alunos de Médio Risco
    db.session.add(User(username="student3", password=hashed_password, role=User.ALUNO))
    db.session.add(User(username="student4", password=hashed_password, role=User.ALUNO))

    # 2 Alunos de Alto Risco
    db.session.add(User(username="student5", password=hashed_password, role=User.ALUNO))
    db.session.add(User(username="student6", password=hashed_password, role=User.ALUNO))

    db.session.commit()
    print("Utilizadores criados (1 coord, 1 prof, 6 alunos).")

def seed_subjects():
    if Subject.query.first() is not None:
        print("Matérias já existem.")
        return

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
    print("Matérias criadas e associadas ao professor.")


def seed_feedbacks():
    if Feedback.query.first() is not None:
        print("Feedbacks já existem.")
        return

    print("Gerando feedbacks para 6 alunos...")
    now = datetime.utcnow()
    
    students = User.query.filter_by(role=User.ALUNO).all()
    professor_subjects = Subject.query.filter(Subject.name.in_([
        'Data Structures', 
        'Database Systems', 
        'Software Engineering'
    ])).all()
    
    if not students or not professor_subjects:
        print("Nenhum aluno ou matéria de professor encontrado para gerar feedbacks.")
        return
    
    comments = {
        'alto': [
            "Estou completamente perdido nesta matéria. Não consigo participar.",
            "Não entendo nada do que é explicado, me sinto muito desmotivado.",
            "As tarefas são muito difíceis e já estou atrasado em várias.",
            "O ambiente não me ajuda e tenho dificuldade em me conectar com o conteúdo.",
            "Me sinto burro nesta aula, acho que vou desistir."
        ],
        'medio': [
            "A aula é ok, mas alguns pontos ficam bem confusos.",
            "Eu participo às vezes, mas não entrego todas as tarefas a tempo.",
            "Estou me esforçando, mas a minha motivação vai e vem.",
            "O ambiente é bom, mas sinto que preciso de mais ajuda para me conectar com a matéria.",
            "Consigo fazer o básico, mas tenho dificuldade em aplicar na prática."
        ],
        'baixo': [
            "Estou adorando a disciplina! Participo sempre que posso.",
            "Consigo cumprir todas as tarefas e me sinto muito motivado.",
            "O ambiente da aula é excelente e acolhedor.",
            "Dedico-me bastante e consigo ver a aplicação prática do conteúdo.",
            "Aula excelente, estou aprendendo muito!"
        ]
    }
    
    score_ranges = {
        'alto': [1, 2],         # Scores muito baixos
        'medio': [2, 3, 4],     # Scores medianos
        'baixo': [4, 5]         # Scores altos
    }

    feedbacks_to_add = []

    for student in students:
        match = re.search(r'(\d+)$', student.username)
        if not match:
            continue
            
        student_num = int(match.group(1))
        
        if 1 <= student_num <= 2:
            profile = 'baixo'
        elif 3 <= student_num <= 4:
            profile = 'medio'
        elif 5 <= student_num <= 6:
            profile = 'alto'
        else:
            continue

        base_scores = score_ranges[profile]
        comment_list = comments[profile]
        
        num_feedbacks = random.randint(3, 5) 
        
        for i in range(num_feedbacks):
            subject = random.choice(professor_subjects)
            days_ago = random.randint(1, 30)
            created_date = now - timedelta(days=days_ago)
            
            answers = {
                'active_participation': random.choice(base_scores),
                'task_completion': random.choice(base_scores),
                'motivation_interest': random.choice(base_scores),
                'welcoming_environment': random.choice(base_scores),
                'comprehension_effort': random.choice(base_scores),
                'content_connection': random.choice(base_scores)
            }
            
            comment = random.choice(comment_list)
            
            feedback = Feedback(
                student_id=student.id,
                subject_id=subject.id,
                active_participation=answers['active_participation'],
                task_completion=answers['task_completion'],
                motivation_interest=answers['motivation_interest'],
                welcoming_environment=answers['welcoming_environment'],
                comprehension_effort=answers['comprehension_effort'],
                content_connection=answers['content_connection'],
                additional_comment=comment,
                created_at=created_date
            )
            
            feedback.overall_score = feedback.calculate_overall_score()
            
            sentiment = analyze_sentiment_text(comment)
            if sentiment:
                feedback.compound = sentiment['compound']
                feedback.neg = sentiment['neg']
                feedback.neu = sentiment['neu']
                feedback.pos = sentiment['pos']
            
            feedbacks_to_add.append(feedback)
    
    db.session.bulk_save_objects(feedbacks_to_add)
    db.session.commit()
    print(f"{len(feedbacks_to_add)} feedbacks criados.")

    print("Calculando análise de risco para todos os alunos...")
    from .services import update_student_risk_analysis
    
    all_subjects = Subject.query.all()
    for student in students:
        for subject in all_subjects:
            has_feedback = Feedback.query.filter_by(student_id=student.id, subject_id=subject.id).first()
            if has_feedback:
                update_student_risk_analysis(student.id, subject.id)
    
    print("Análise de risco concluída.")
    
    db.session.bulk_save_objects(feedbacks_to_add)
    db.session.commit()
    print(f"{len(feedbacks_to_add)} feedbacks criados.")

    print("Calculando análise de risco para todos os alunos.")
    from .services import update_student_risk_analysis
    
    all_subjects = Subject.query.all()
    for student in students:
        for subject in all_subjects:
            has_feedback = Feedback.query.filter_by(student_id=student.id, subject_id=subject.id).first()
            if has_feedback:
                update_student_risk_analysis(student.id, subject.id)
    
    print("Análise de risco concluída.")
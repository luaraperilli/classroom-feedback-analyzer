from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from .models import db, User, Subject, Feedback
from .services import analyze_sentiment_text, update_student_risk_analysis
import random

SUBJECT_NAMES = [
    'Data Structures',
    'Database Systems',
    'Software Engineering',
    'Computer Networks',
    'Information Security',
]

# (username, display name used in comments, risk profile)
# (username, first_name, last_name, risk_profile)
STUDENTS = [
    ('Marina',   'Marina',   'Santos',   'baixo'),
    ('Gabriela', 'Gabriela', 'Oliveira', 'baixo'),
    ('Alan',     'Alan',     'Costa',    'medio'),
    ('Pedro',    'Pedro',    'Almeida',  'medio'),
    ('Gabriel',  'Gabriel',  'Ferreira', 'alto'),
    ('Juliana',  'Juliana',  'Lima',     'alto'),
]

# Comments per profile — varied enough to produce distinct sentiment arcs
COMMENTS = {
    'baixo': [
        'Adorei a aula de hoje! O professor explicou muito bem e consegui acompanhar tudo.',
        'Aula excelente. Estou aprendendo bastante e me sinto motivado a continuar.',
        'O conteúdo foi bem apresentado. Consigo relacionar com o que vimos na semana passada.',
        'Participei bastante hoje e cumpri todas as atividades. Ambiente acolhedor.',
        'Muito boa aula. O ritmo estava ótimo e tirei todas as dúvidas que tinha.',
        'Me sinto confiante com o conteúdo. A prática ajudou muito a fixar.',
        'Ótima dinâmica de aula. Gostei especialmente dos exemplos práticos.',
        'Consegui entregar todas as tarefas e ainda ajudei um colega. Satisfeito.',
        'Aula produtiva. O conteúdo foi claro e o ambiente estimulante.',
        'Estou gostando muito da disciplina. Sinto evolução semana a semana.',
    ],
    'medio': [
        'A aula foi ok, mas alguns pontos ficaram confusos. Vou rever o material.',
        'Participei parcialmente. Tive dificuldade em um exercício mas resolvi depois.',
        'O ritmo estava um pouco rápido hoje. Precisei parar e reler algumas partes.',
        'Entendi a maior parte, mas a parte prática me gerou dúvidas.',
        'Aula razoável. Consigo acompanhar, mas minha motivação está oscilando.',
        'Fiz as tarefas, mas com dificuldade em algumas. Preciso estudar mais.',
        'Alguns conceitos ainda não estão claros pra mim. Vou pedir ajuda.',
        'A aula foi boa em geral, mas fiquei perdido em um ponto específico.',
        'Estou conseguindo acompanhar, mas o conteúdo está ficando mais denso.',
        'Aula mediana. Espero que a próxima seja mais tranquila.',
    ],
    'alto': [
        'Não estou conseguindo acompanhar o ritmo. Me sinto muito perdido.',
        'Não entendo nada do que é explicado. Estou desmotivado e pensando em desistir.',
        'As tarefas são muito difíceis e já estou atrasado em várias delas.',
        'Me sinto completamente perdido nesta matéria. Não consigo participar.',
        'O conteúdo avança rápido demais. Não consigo absorver nada.',
        'Estou atrasado e sem motivação. Não sei se vou conseguir recuperar.',
        'Muito difícil. Não consigo relacionar com nada que já aprendi antes.',
        'Me sinto excluído das discussões porque não entendo o básico.',
        'Já perdi muitas entregas. Estou considerando trancar a matéria.',
        'Nada faz sentido pra mim ainda. Preciso de um suporte diferente.',
    ],
}

# Score ranges per profile
SCORES = {
    'baixo': [4, 5],
    'medio': [2, 3, 4],
    'alto':  [1, 2],
}

# Sentiment arc per profile: list of week offsets and tendency modifier
# This makes the chart show nuanced evolution instead of flat data
def get_week_modifier(profile, week_index, total_weeks):
    if profile == 'baixo':
        # Starts good, small dip mid-semester, recovers
        progress = week_index / max(total_weeks - 1, 1)
        return 0.1 * (-1 if 0.3 < progress < 0.6 else 1)
    if profile == 'medio':
        # Starts neutral, worsens slightly, stabilises
        progress = week_index / max(total_weeks - 1, 1)
        return -0.15 * progress + 0.05
    # alto: steady decline
    return -0.05 * week_index


def seed_all():
    if User.query.first() is not None:
        print('Database already seeded.')
        return
    seed_users()
    seed_subjects()
    seed_feedbacks()
    print('Database seeded successfully.')


def seed_users():
    pw = generate_password_hash('123', method='pbkdf2:sha256')

    coordinator = User(username='Coordenador', password=pw, role=User.COORDENADOR)
    professor   = User(username='Professor',   password=pw, role=User.PROFESSOR)
    db.session.add_all([coordinator, professor])

    for username, first_name, last_name, _ in STUDENTS:
        db.session.add(User(username=username, password=pw, role=User.ALUNO,
                            first_name=first_name, last_name=last_name))

    db.session.commit()
    print(f'Users created: coordinator, professor, {len(STUDENTS)} students.')


def seed_subjects():
    subjects = [Subject(name=name) for name in SUBJECT_NAMES]
    db.session.add_all(subjects)
    db.session.commit()

    professor = User.query.filter_by(role=User.PROFESSOR).first()
    for subject in subjects[:3]:
        professor.subjects.append(subject)
    db.session.commit()
    print('Subjects created and assigned.')


def seed_feedbacks():
    students = {u.username: u for u in User.query.filter_by(role=User.ALUNO).all()}
    subjects = Subject.query.filter(Subject.name.in_(SUBJECT_NAMES[:3])).all()
    now = datetime.utcnow()

    feedbacks_to_add = []

    for username, _, _, profile in STUDENTS:
        student = students[username]
        score_pool   = SCORES[profile]
        comment_pool = COMMENTS[profile]

        # Each student gets 8-12 feedbacks spread over 8 weeks
        total_weeks = 8
        num_feedbacks = random.randint(8, 12)

        for i in range(num_feedbacks):
            week_index = random.randint(0, total_weeks - 1)
            # Spread within the week
            days_offset = week_index * 7 + random.randint(0, 4)
            created_at  = now - timedelta(days=(total_weeks * 7 - days_offset))

            base_scores = [random.choice(score_pool) for _ in range(6)]

            # Apply arc modifier: nudge scores up or down based on week
            modifier = get_week_modifier(profile, week_index, total_weeks)
            adjusted = [max(1, min(5, round(s + modifier))) for s in base_scores]

            comment = random.choice(comment_pool)
            subject = random.choice(subjects)

            fb = Feedback(
                student_id=student.id,
                subject_id=subject.id,
                active_participation=adjusted[0],
                task_completion=adjusted[1],
                motivation_interest=adjusted[2],
                welcoming_environment=adjusted[3],
                comprehension_effort=adjusted[4],
                content_connection=adjusted[5],
                additional_comment=comment,
                created_at=created_at,
            )
            fb.overall_score = fb.calculate_overall_score()

            sentiment = analyze_sentiment_text(comment)
            if sentiment:
                fb.compound = sentiment['compound']
                fb.neg      = sentiment['neg']
                fb.neu      = sentiment['neu']
                fb.pos      = sentiment['pos']

            feedbacks_to_add.append(fb)

    db.session.bulk_save_objects(feedbacks_to_add)
    db.session.commit()
    print(f'{len(feedbacks_to_add)} feedbacks created.')

    all_subjects = Subject.query.all()
    for username, _, _, _ in STUDENTS:
        student = students[username]
        for subject in all_subjects:
            if Feedback.query.filter_by(student_id=student.id, subject_id=subject.id).first():
                update_student_risk_analysis(student.id, subject.id)

    print('Risk analysis computed.')

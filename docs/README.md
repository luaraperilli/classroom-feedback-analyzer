# Classroom Feedback Analyzer

A web application for collecting structured student feedback and performing sentiment analysis on classroom engagement. Professors and coordinators can monitor student well-being and identify at-risk students in real time.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [API Reference](#api-reference)
6. [Roles and Permissions](#roles-and-permissions)
7. [Frontend Routes](#frontend-routes)
8. [Sentiment Analysis](#sentiment-analysis)
9. [Design Principles](#design-principles)

---

## Project Overview

Classroom Feedback Analyzer lets **students** submit weekly engagement feedback about their classes through a structured form. Each submission includes six Likert-scale questions covering behavioral, emotional, and cognitive dimensions, plus a free-text comment. The free-text comment is analyzed automatically using **pysentimiento**, a Portuguese-language NLP model, to produce a sentiment score.

**Professors** see an aggregated dashboard of all feedback for their subjects, with sentiment trends and an at-risk panel identifying students who may be disengaging. **Coordinators** have the same dashboard view across all subjects and can also manage subjects and professor assignments.

The project was designed following principles drawn from Grimalt (2019) on student-centered feedback systems, with a focus on non-comparative, plain-language reporting that supports student agency rather than surveillance.

---

## Architecture

```
React SPA (frontend)
      |
      | HTTP/JSON  (JWT Bearer token)
      v
Flask REST API (backend)
      |
      |-- pysentimiento (Portuguese NLP, runs in-process)
      |
      v
SQLite database (app/instance/feedback.db)
```

- **Authentication**: JWT access tokens (1-hour expiry) + refresh tokens (30-day expiry), issued by Flask-JWT-Extended. The frontend stores tokens in `localStorage` and refreshes them transparently.
- **NLP**: `pysentimiento` runs as a singleton inside the Flask process. The `pt` (Portuguese) sentiment model returns `POS`, `NEG`, and `NEU` probabilities; compound is derived as `POS - NEG`.
- **Database**: SQLite via SQLAlchemy. On first run the schema is created automatically and seed data is loaded.

---

## Project Structure

```
classroom-feedback-analyzer/
├── app/
│   ├── __init__.py          # Flask application factory, extensions, blueprints
│   ├── models.py            # SQLAlchemy models: User, Subject, Feedback, StudentRiskAnalysis
│   ├── services.py          # Business logic: sentiment analysis, feedback creation, risk calculation
│   ├── routes.py            # API blueprint: feedback, risk, and subject endpoints
│   ├── auth.py              # Auth blueprint: /register, /login, /refresh
│   ├── admin.py             # Admin blueprint: subject and professor management
│   ├── seeder.py            # Database seed data (demo users and subjects)
│   └── instance/
│       └── feedback.db      # SQLite database (auto-created)
├── config.py                # Configuration classes (Development)
├── run.py                   # Entry point: loads .env and starts Flask dev server
├── requirements.txt         # Python dependencies
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.js           # Root component, navigation, routing
│       ├── App.css          # Global styles and component styles
│       ├── index.js         # React DOM entry point
│       ├── index.css        # Base body/code font reset
│       ├── ProtectedRoute.js # Role-aware route guard
│       ├── components/
│       │   ├── SentimentTrendChart.js  # Chart.js line chart, daily or weekly grouping
│       │   └── SentimentSummary.js     # Positive/neutral/negative count cards
│       ├── features/
│       │   ├── auth/
│       │   │   ├── AuthContext.js   # JWT auth state, login/logout/refresh
│       │   │   ├── LoginPage.js     # Login form
│       │   │   └── RegisterPage.js  # Registration form
│       │   ├── feedback/
│       │   │   └── FeedbackForm.js  # Student feedback submission form
│       │   ├── student/
│       │   │   ├── SentimentResult.js  # Post-submission result card
│       │   │   └── StudentHistory.js   # Student personal history and gauge
│       │   ├── dashboard/
│       │   │   ├── Dashboard.js        # Professor/coordinator feedback view
│       │   │   ├── RiskAnalysis.js     # At-risk student grid
│       │   │   └── useDashboardData.js # Data-fetching hook with token refresh
│       │   └── coordinator/
│       │       └── CoordinatorPage.js  # Subject and professor management UI
│       ├── services/
│       │   └── api.js        # Typed fetch wrappers for all API endpoints
│       └── utils/
│           ├── sentiment.js  # Sentiment label/color helpers, ISO week calculation
│           └── translations.js # Subject name display translations
└── docs/
    └── README.md            # This file
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm

### Backend

```bash
cd classroom-feedback-analyzer

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) create a .env file with custom secret keys — see Environment Variables below

# Start the development server
python run.py
# The API will be available at http://localhost:5000
```

On first startup, Flask will create `app/instance/feedback.db` and run the seeder to populate demo users and subjects.

### Frontend

```bash
cd classroom-feedback-analyzer/frontend

npm install
npm start
# The app will open at http://localhost:3000
```

### Environment Variables

| Variable | Where used | Description |
|---|---|---|
| `SECRET_KEY` | `config.py` | Flask secret key for session signing |
| `JWT_SECRET_KEY` | `config.py` | Key used to sign JWT tokens |
| `REACT_APP_API_BASE_URL` | Frontend `.env` | Base URL for the Flask API (default: `http://localhost:5000`) |

Create a `.env` file in the project root (backend) to override `SECRET_KEY` and `JWT_SECRET_KEY`. Create `frontend/.env` to set `REACT_APP_API_BASE_URL` for non-default deployments.

---

## API Reference

All endpoints that require authentication expect an `Authorization: Bearer <access_token>` header.

| Method | Path | Auth required | Role | Description |
|---|---|---|---|---|
| POST | `/login` | No | Any | Authenticate and receive access + refresh tokens |
| POST | `/register` | No | Any | Register a new user account |
| POST | `/refresh` | Yes (refresh token) | Any | Exchange a refresh token for a new access token |
| POST | `/analyze` | Yes | aluno | Submit a feedback form; triggers sentiment analysis |
| GET | `/feedbacks` | Yes | professor, coordenador | List all feedback (filterable by subject, date range) |
| GET | `/my-feedbacks` | Yes | aluno | List the authenticated student's own feedback history |
| GET | `/students-at-risk` | Yes | professor, coordenador | List students flagged by the risk model (filterable) |
| GET | `/student-progress/<id>` | Yes | professor, coordenador | Detailed risk analyses and recent feedback for one student |
| GET | `/subjects` | Yes | Any | List subjects (scoped to professor's own subjects if role is professor) |
| POST | `/admin/subjects` | Yes | coordenador | Create a new subject |
| GET | `/admin/professors` | Yes | coordenador | List all professors |
| POST | `/admin/subjects/<id>/assign` | Yes | coordenador | Assign a professor to a subject |

### Query Parameters

`GET /feedbacks` and `GET /students-at-risk` accept:

- `subject_id` — filter by subject
- `start_date`, `end_date` — ISO 8601 date strings (feedbacks only)
- `min_risk` — `baixo`, `medio`, or `alto` (risk endpoint only; default `medio`)

---

## Roles and Permissions

| Role | Portuguese name | Capabilities |
|---|---|---|
| Student | aluno | Submit feedback, view own history and sentiment results |
| Professor | professor | View dashboard for assigned subjects, access at-risk panel for own subjects |
| Coordinator | coordenador | Full dashboard across all subjects, at-risk panel, create subjects, assign professors |

Role is set at registration and embedded in the JWT claims. Professors are scoped to subjects they have been explicitly assigned to by a coordinator.

---

## Frontend Routes

| Path | Component | Access |
|---|---|---|
| `/` | `FeedbackForm` | aluno only |
| `/historico` | `StudentHistory` | aluno only |
| `/dashboard` | `Dashboard` | professor, coordenador |
| `/coordinator` | `CoordinatorPage` | coordenador only |
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |

Routes are protected by `ProtectedRoute`, which checks authentication state and role. Unauthenticated users are redirected to `/login`; users accessing a route outside their role are redirected to their home page.

---

## Sentiment Analysis

### Model

Sentiment is analyzed using [pysentimiento](https://github.com/pysentimiento/pysentimiento), a transformer-based NLP library with native support for Portuguese (`lang="pt"`). The model is loaded once at application startup as a module-level singleton to avoid repeated initialization overhead.

### Score Derivation

When a student submits a feedback comment, `analyze_sentiment_text()` passes the text to the model and receives probability estimates for three classes: `POS`, `NEU`, and `NEG`. The following values are stored per feedback record:

| Field | Description |
|---|---|
| `pos` | Probability that the comment is positive (0–1) |
| `neg` | Probability that the comment is negative (0–1) |
| `neu` | Probability that the comment is neutral (0–1) |
| `compound` | Derived score: `pos - neg`, range −1 to +1 |

A `compound` value >= 0.05 is classified as positive, <= −0.05 as negative, and anything in between as neutral. These thresholds follow the convention established by VADER sentiment analysis and are defined in `frontend/src/utils/sentiment.js`.

### Overall Score

The `overall_score` field (0–1) is the normalized mean of the six Likert responses. Each response is on a 1–5 scale; the formula `(mean - 1) / 4` maps the range to [0, 1], where 1 means fully satisfied across all dimensions.

### Risk Score

`StudentRiskAnalysis.calculate_risk_score()` combines three components:

| Component | Weight (with sentiment) | Weight (no sentiment) | Description |
|---|---|---|---|
| Inverted average score | 50% | 70% | `1 - overall_score`; low engagement increases risk |
| Sentiment risk | 30% | 0% | `(1 - compound) / 2`; maps compound from [−1, +1] to [0, 1] |
| Consistency risk | 20% | 30% | `max(0, (5 - feedback_count) / 5) * 0.3`; fewer than 5 submissions increases uncertainty |

The resulting `risk_score` (0–1) maps to three levels: `baixo` (< 0.3), `medio` (0.3–0.6), `alto` (>= 0.6).

---

## Design Principles

The UI and data presentation choices are informed by Grimalt's (2019) research on feedback systems in higher education:

- **Student-first framing**: the student's own progress page (`/historico`) shows only their own data. No peer comparison is surfaced anywhere.
- **Plain language over numbers**: sentiment results are shown as "positive", "neutral", or "negative" with a plain sentence explanation before any numeric score is shown.
- **Weekly trend view**: the student history chart groups feedback by ISO week so short-term fluctuations do not create misleading noise.
- **Color-coded sentiment**: green/grey/red is used consistently for positive/neutral/negative throughout the interface, matching the CSS custom properties `--positive-color`, `--neutral-color`, and `--negative-color`.
- **Non-punitive risk language**: the risk panel is framed as "students who may need special attention" rather than labeling students as failures; risk levels use the internal labels `baixo/medio/alto` but are presented to professors with softened phrasing.
- **Progressive disclosure**: the feedback form only shows the Likert questions and comment field after a subject is selected, reducing cognitive load for students.
- **Minimal navigation**: each role sees only the routes relevant to their function, reducing confusion for non-technical users.

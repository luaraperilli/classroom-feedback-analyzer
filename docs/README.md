# Classroom Feedback Analyzer

A web application for collecting structured student feedback, performing sentiment analysis with **pysentimiento**, and providing explainability through **SHAP** and **LIME** techniques. Professors and coordinators can monitor student well-being, identify at-risk students, and understand which words systematically influence sentiment classifications.

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
9. [Explainability (SHAP & LIME)](#explainability-shap--lime)
10. [Design Principles](#design-principles)

---

## Project Overview

Classroom Feedback Analyzer lets **students** submit weekly engagement feedback about their classes through a structured form. Each submission includes six Likert-scale questions covering behavioral, emotional, and cognitive dimensions, plus a free-text comment. The free-text comment is analyzed automatically using **pysentimiento**, a Portuguese-language NLP model, to produce a sentiment score.

After classification, the system applies two explainability techniques — **LIME** (Local Interpretable Model-agnostic Explanations) and **SHAP** (SHapley Additive exPlanations) — to identify which words most influenced the sentiment classification. Students can visualize the highlighted words and toggle between both methods to compare their interpretations.

**Professors** see an aggregated dashboard with sentiment trends, an at-risk panel, and a **global SHAP analysis** tab that reveals which words systematically influence classifications across all feedbacks. **Coordinators** have the same dashboard view across all subjects and can also manage subjects and professor assignments.

The project was designed following principles drawn from Grimalt-Álvaro & Usart (2024) on student-centered feedback systems, with a focus on non-comparative, plain-language reporting that supports student agency rather than surveillance.

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
      |-- LIME (post-hoc local explainability)
      |-- SHAP (post-hoc local + global explainability)
      |
      v
SQLite database (instance/feedback.db)
```

- **Authentication**: JWT access tokens (1-hour expiry) + refresh tokens (30-day expiry), issued by Flask-JWT-Extended. The frontend stores tokens in `localStorage` and refreshes them transparently. The `/refresh` endpoint includes `username` and `role` in the new token's claims.
- **NLP**: `pysentimiento` runs as a singleton inside the Flask process. The `pt` (Portuguese) sentiment model returns `POS`, `NEG`, and `NEU` probabilities; compound is derived as `POS - NEG`.
- **Explainability**: LIME generates 300 text perturbations and fits a local linear model; SHAP computes Shapley values with up to 500 model evaluations. Both run as post-hoc explainers over pysentimiento via a shared `_predict_proba` wrapper.
- **Database**: SQLite via SQLAlchemy. On first run the schema is created automatically and seed data is loaded (including pre-computed LIME/SHAP attributions).
- **Configuration**: `API_BASE_URL` is centralized in `frontend/src/config.js` (single source of truth).

---

## Project Structure

```
classroom-feedback-analyzer/
├── app/
│   ├── __init__.py          # Flask application factory, extensions, blueprints
│   ├── models.py            # SQLAlchemy models: User, Subject, Feedback, StudentRiskAnalysis
│   ├── services.py          # Sentiment analysis, LIME/SHAP explainers, feedback creation, risk calculation
│   ├── routes.py            # API blueprint: feedback, risk, explainability, and subject endpoints
│   ├── auth.py              # Auth blueprint: /register, /login, /refresh
│   ├── admin.py             # Admin blueprint: subject and professor management
│   ├── decorators.py        # @requires_role decorator for role-based access control
│   └── seeder.py            # Database seed data with pre-computed LIME/SHAP attributions
├── config.py                # Configuration classes (Development)
├── run.py                   # Entry point: loads .env and starts Flask dev server
├── requirements.txt         # Python dependencies (Flask, pysentimiento, lime, shap)
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.js           # Root component, navigation, routing, ErrorBoundary
│       ├── App.css          # Global styles, page transition animation
│       ├── config.js        # Centralized API_BASE_URL
│       ├── ProtectedRoute.js # Role-aware route guard
│       ├── components/
│       │   ├── SentimentTrendChart.js  # Recharts ComposedChart, daily or weekly grouping
│       │   ├── SentimentSummary.js     # Positive/neutral/negative count cards with bars
│       │   └── ErrorBoundary.js        # React error boundary with fallback UI
│       ├── features/
│       │   ├── auth/
│       │   │   ├── AuthContext.js   # JWT auth state, login/logout/refresh, profile fetch on startup
│       │   │   ├── AuthLeftPanel.js # Shared decorative left panel for login/register
│       │   │   ├── LoginPage.js     # Split-screen login form
│       │   │   └── RegisterPage.js  # Split-screen registration with password validation
│       │   ├── feedback/
│       │   │   └── FeedbackForm.js  # Student feedback form with subject chips and Likert questions
│       │   ├── student/
│       │   │   ├── StudentHistory.js # Student progress: chart, highlighted comments, LIME/SHAP toggle
│       │   │   └── ProfilePage.js    # Student profile with gradient header
│       │   ├── dashboard/
│       │   │   ├── Dashboard.js        # Professor/coordinator view with tabs and date range modal
│       │   │   ├── RiskAnalysis.js     # At-risk student grid grouped by risk level
│       │   │   ├── GlobalShapAnalysis.js # Global SHAP bar chart and word table
│       │   │   └── useDashboardData.js # Data-fetching hook with token refresh
│       │   └── coordinator/
│       │       └── CoordinatorPage.js  # Subject and professor management UI
│       ├── pages/
│       │   └── NotFoundPage.js  # 404 page
│       ├── services/
│       │   └── api.js        # Fetch wrappers for all API endpoints (uses buildUrl consistently)
│       └── utils/
│           ├── sentiment.js     # Sentiment label/color helpers, ISO week calculation
│           ├── translations.js  # Subject name display translations
│           └── wordHighlight.js # Token highlighting with LIME/SHAP attributions (lexicon fallback)
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

# Start the development server
python run.py
# The API will be available at http://localhost:5000
```

On first startup, Flask will create `instance/feedback.db` and run the seeder. The seeder pre-computes LIME and SHAP attributions for all 30 unique comments (~15-40 minutes depending on hardware).

### Frontend

```bash
cd classroom-feedback-analyzer/frontend

npm install
npm start
# The app will open at http://localhost:3000
```

### Demo Credentials

| User | Password | Role |
|---|---|---|
| `Coordenador` | `123` | Coordinator |
| `Professor` | `123` | Professor |
| `Marina` | `123` | Student (low risk) |
| `Gabriel` | `123` | Student (high risk) |

### Environment Variables

| Variable | Where used | Description |
|---|---|---|
| `SECRET_KEY` | `config.py` | Flask secret key for session signing |
| `JWT_SECRET_KEY` | `config.py` | Key used to sign JWT tokens |
| `REACT_APP_API_BASE_URL` | `frontend/src/config.js` | Base URL for the Flask API (default: `http://localhost:5000`) |

---

## API Reference

All endpoints that require authentication expect an `Authorization: Bearer <access_token>` header.

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/login` | No | Any | Authenticate and receive access + refresh tokens |
| POST | `/register` | No | Any | Register a new user account |
| POST | `/refresh` | Yes (refresh) | Any | Exchange a refresh token for a new access token (with role claims) |
| GET | `/profile` | Yes | Any | Get authenticated user's profile |
| PUT | `/profile` | Yes | Any | Update profile (name, password) |
| POST | `/analyze` | Yes | aluno | Submit feedback; triggers sentiment + LIME + SHAP analysis |
| GET | `/feedbacks` | Yes | professor, coordenador | List all feedback (filterable by subject, date range) |
| GET | `/my-feedbacks` | Yes | aluno | List the authenticated student's own feedback history |
| GET | `/students-at-risk` | Yes | professor, coordenador | List students flagged by the risk model |
| GET | `/student-progress/<id>` | Yes | professor, coordenador | Detailed risk analyses for one student |
| GET | `/global-shap` | Yes | professor, coordenador | Aggregated SHAP values across all feedbacks |
| GET | `/subjects` | Yes | Any | List subjects (scoped to professor's own if role is professor) |
| POST | `/admin/subjects` | Yes | coordenador | Create a new subject |
| GET | `/admin/professors` | Yes | coordenador | List all professors (includes `subject_count`) |
| POST | `/admin/subjects/<id>/assign` | Yes | coordenador | Assign a professor to a subject |

### Query Parameters

- `/feedbacks`: `subject_id`, `start_date`, `end_date` (ISO 8601)
- `/students-at-risk`: `subject_id`, `min_risk` (`baixo` | `medio` | `alto`, default `medio`)
- `/my-feedbacks`: `subject_id`
- `/global-shap`: `subject_id`

---

## Roles and Permissions

| Role | Portuguese name | Capabilities |
|---|---|---|
| Student | aluno | Submit feedback, view own history with LIME/SHAP highlights, view profile |
| Professor | professor | Dashboard (feedbacks, risk, global SHAP) for assigned subjects |
| Coordinator | coordenador | Full dashboard across all subjects, create subjects, assign professors |

Role is set at registration and embedded in the JWT claims. Access control is enforced by the `@requires_role` decorator.

---

## Frontend Routes

| Path | Component | Access |
|---|---|---|
| `/` | `FeedbackForm` | aluno only |
| `/historico` | `StudentHistory` | aluno only |
| `/perfil` | `ProfilePage` | aluno only |
| `/dashboard` | `Dashboard` (3 tabs: Feedbacks, Risk, Explainability) | professor, coordenador |
| `/coordinator` | `CoordinatorPage` | coordenador only |
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |
| `*` | `NotFoundPage` | Public |

Routes are protected by `ProtectedRoute`. Page transitions use a CSS `pageFadeIn` animation keyed by `location.pathname`.

---

## Sentiment Analysis

### Model

Sentiment is analyzed using [pysentimiento](https://github.com/pysentimiento/pysentimiento), a transformer-based NLP library with native support for Portuguese (`lang="pt"`). The model is loaded once at application startup as a module-level singleton.

### Score Derivation

| Field | Description |
|---|---|
| `pos` | Probability that the comment is positive (0-1) |
| `neg` | Probability that the comment is negative (0-1) |
| `neu` | Probability that the comment is neutral (0-1) |
| `compound` | Derived score: `pos - neg`, range -1 to +1 |

A `compound` value >= 0.05 is classified as positive, <= -0.05 as negative, and anything in between as neutral.

### Overall Score

The `overall_score` field (0-1) is the normalized mean of the six Likert responses. Formula: `(mean - 1) / 4`.

### Risk Score

`StudentRiskAnalysis.calculate_risk_score()` uses named class constants for all weights and thresholds:

| Constant | Value | Description |
|---|---|---|
| `WEIGHT_SCORE` | 0.5 | Engagement score weight (with sentiment data) |
| `WEIGHT_SENTIMENT` | 0.3 | Sentiment risk weight |
| `WEIGHT_CONSISTENCY` | 0.2 | Submission consistency weight |
| `WEIGHT_SCORE_NO_SENT` | 0.7 | Score weight when no sentiment data |
| `WEIGHT_CONSISTENCY_NO_SENT` | 0.3 | Consistency weight when no sentiment data |
| `CONSISTENCY_CAP` | 5 | Minimum feedbacks for full consistency score |
| `THRESHOLD_ALTO` | 0.6 | Risk score threshold for "alto" level |
| `THRESHOLD_MEDIO` | 0.3 | Risk score threshold for "medio" level |

---

## Explainability (SHAP & LIME)

### LIME (Local Explanations)

LIME (Ribeiro et al., 2016) generates **300 perturbations** of the original text by randomly removing words. Each perturbation is classified by pysentimiento, and a local linear model is fitted to identify which words most influenced the prediction. The result is a dictionary `{word: weight}` stored in `token_attributions_json`.

### SHAP (Local Explanations)

SHAP (Lundberg & Lee, 2017) computes Shapley values by evaluating the model with up to **500 combinations** of masked/unmasked words. Each word receives a value representing its marginal contribution to the prediction, satisfying the properties of efficiency, symmetry, dummy, and additivity. The result is stored in `shap_attributions_json`.

### SHAP (Global Analysis)

The `/global-shap` endpoint aggregates SHAP values across all feedbacks, computing the **mean Shapley value** and **occurrence count** per word. This reveals which words systematically drive positive or negative classifications across the entire dataset. The professor dashboard presents this as a horizontal bar chart and detailed table in the "Explicabilidade" tab.

### Frontend Visualization

- Each feedback card in `StudentHistory` highlights words with **green** (positive contribution) or **red** (negative contribution), with intensity proportional to the weight.
- A **toggle** lets the student switch between LIME and SHAP to compare interpretations.
- For older feedbacks without backend attributions, a **static Portuguese lexicon** provides fallback highlighting.

---

## Design Principles

The UI and data presentation choices are informed by Grimalt-Álvaro & Usart (2024) on feedback systems in higher education:

- **Student-first framing**: the student's progress page shows only their own data with no peer comparison.
- **Explainability as learning tool**: highlighted words and the LIME/SHAP toggle encourage students to reflect on how their language is interpreted, making feedback a bidirectional process (Cavalcanti et al., 2023).
- **Weekly trend view**: the student history chart groups feedback by ISO week to avoid misleading short-term fluctuations.
- **Color-coded sentiment**: green/grey/red used consistently for positive/neutral/negative throughout.
- **Progressive disclosure**: expandable feedback cards, subject chip selection, and modal-based date range filters reduce cognitive load.
- **Non-punitive risk language**: the risk panel is framed as "students who may need attention" rather than labeling students as failures.
- **Minimal navigation**: each role sees only routes relevant to their function.

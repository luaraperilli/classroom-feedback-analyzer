# Voz Discente

A web app for collecting structured student feedback, analyzing the free-text
comment's sentiment with **pysentimiento** (Portuguese NLP), and explaining it with
**LIME** and **SHAP**. The focus is student-centered: each student reflects on how
they *felt* and how much they *understood*, per class theme. Professors and
coordinators get an aggregated dashboard (sentiment trends, at-risk panel, global SHAP).

## Tech stack

- **Backend:** Flask (REST API), SQLAlchemy + SQLite, Flask-JWT-Extended
- **NLP:** pysentimiento (sentiment) · LIME + SHAP (explainability)
- **Frontend:** React (CRA), React Router, Tailwind CSS, Recharts

## Architecture

```
React SPA  ──HTTP/JSON (JWT Bearer)──▶  Flask REST API
                                         ├─ pysentimiento  (Portuguese sentiment, in-process)
                                         ├─ LIME           (local explanations)
                                         ├─ SHAP           (local + global explanations)
                                         └─ SQLite         (app/instance/feedback.db)
```

- **Auth:** JWT access token (1 h) + refresh token (7 days), stored in `localStorage`
  and refreshed transparently.
- **NLP:** pysentimiento runs as an in-process singleton; `compound = pos − neg`.
- **Config:** the frontend API base URL is centralized in `frontend/src/config.js`.

## Getting Started

### Prerequisites
- Python 3.10–3.12
- Node.js 18+ and npm

### Run (development)

One command from `frontend/` starts **both** the backend and the frontend:

```bash
cd frontend
npm install        # first time only
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

The first run creates `app/instance/feedback.db`, seeds demo data, and pre-computes
LIME/SHAP attributions for the sample comments (can take several minutes).

> Manual alternative — backend: `source venv/bin/activate && python run.py` ·
> frontend: `npm start`.

### Demo credentials (development only)

| User | Password | Role |
|---|---|---|
| `Coordenador` | `123` | Coordinator |
| `Professor` | `123` | Professor |
| `Marina` | `123` | Student |

Login is case-insensitive. These accounts are seeded **only in development**.

### Environment variables

Copy `.env.example` to `.env`. Not needed for local development (safe fallbacks);
**required in production**.

| Variable | Description |
|---|---|
| `FLASK_CONFIG` | `development` (default) or `production` |
| `SECRET_KEY` / `JWT_SECRET_KEY` | Distinct random secrets — **required in production** (boot fails without them) |
| `CORS_ORIGINS` | Allowed frontend origin(s), comma-separated |
| `DATABASE_URL` | Optional; defaults to local SQLite |
| `HOST` / `PORT` | Optional network binding for the backend |
| `REACT_APP_API_BASE_URL` | Frontend API base URL (default `http://localhost:5001`) |

## Roles

| Role | Capabilities |
|---|---|
| **aluno** | Submit feedback (per class theme), view own history with highlighted words and a per-theme reflection, manage profile |
| **professor** | Dashboard (feedbacks, at-risk, global SHAP) and theme management for assigned subjects |
| **coordenador** | Full dashboard across all subjects; manage subjects, professors, and themes |

Public sign-up (`/register`) always creates an **aluno** — professor/coordinator
accounts are created through administration. Access is enforced by the
`@requires_role` decorator and JWT claims.

## How it works

### Sentiment
pysentimiento (`lang="pt"`) returns `pos`, `neg`, `neu`; `compound = pos − neg`
(range −1…+1): `≥ 0.05` positive, `≤ −0.05` negative, otherwise neutral. The
`overall_score` (0–1) is the normalized mean of the six Likert answers: `(mean − 1) / 4`.

### Explainability
- **LIME** (Ribeiro et al., 2016): 5000 text perturbations + a local linear model →
  `{word: weight}`. The count follows the library default and the convergence regime
  for text (Mardaoui & Garreau, 2021); reducing it harms stability
  (Visani et al., 2022; Zhao et al., 2021).
- **SHAP** (Lundberg & Lee, 2017): Shapley values with `max_evals='auto'` (scales with
  text length, per the official SHAP sentiment tutorial).
- **Global SHAP** (`/global-shap`): aggregates mean Shapley value + occurrence per word
  across all feedback (professor "Explicabilidade" tab).
- In the student view, influential words are highlighted (green = positive,
  red = negative) in **plain language** — no technical jargon.

### Risk model
`StudentRiskAnalysis` combines engagement score, sentiment, and submission consistency
into a 0–1 risk score (levels *baixo / medio / alto*). All weights and thresholds are
named constants in `app/models.py`.

## Security

- Passwords hashed with PBKDF2-SHA256; a strong-password policy (≥ 8 chars, upper,
  lower, number) is enforced on the server.
- Pre-registered students must set their own password on first login
  (`must_change_password`).
- Public registration cannot create staff roles.
- In production, secrets are required from the environment, debug is off, and CORS is
  restricted to `CORS_ORIGINS`.

## Project structure (top level)

```
app/         Flask backend — models, routes, auth, admin, services, seeder
frontend/    React app — features/, components/, services/api.js, utils/
config.py    Development / Production config profiles
run.py       Backend entry point (loads .env)
docs/        This README
```

The authoritative list of API endpoints lives in `app/routes.py`, `app/auth.py`, and
`app/admin.py` — refer to those files instead of duplicating them here.

## Design principles

Informed by Grimalt-Álvaro & Usart (2024) on student-centered feedback:

- **Student-first:** each student sees only their own data — no peer comparison.
- **Reflection over surveillance:** the per-theme view highlights topics to revisit
  (metacognition), turning feedback into a learning tool.
- **Plain language:** explainability is shown without technical jargon.
- **Consistent sentiment colors** and progressive disclosure to reduce cognitive load.
- **Non-punitive risk language:** "students who may need attention," never labeling.

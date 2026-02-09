# SkillScreen AI

> An end-to-end AI-powered hiring assessment platform that eliminates bias, automates evaluation, and catches fraud — from job posting to final hire.

Built with **Google Gemini LLM**, **TensorFlow.js (COCO-SSD)**, **Socket.io**, and a modern **Next.js + Express** stack.

---

## What Makes It Different

| Traditional Hiring Platforms | SkillScreen AI |
|---|---|
| Manual resume screening | **Three-layer AI screening** with hard rejection rules, Gemini analysis, and regex fallback |
| Generic question banks | **AI-generated assessments** tailored to each JD — MCQ, subjective, and coding |
| No proctoring or honor-based | **Real-time client-side proctoring** with webcam AI (face count, phone detection, gaze tracking) |
| Recruiter evaluates manually | **AI evaluates all answers** — exact match, rubric-based, and code analysis |
| Unconscious bias in selection | **Anonymous hiring mode** — candidates appear as Greek letter aliases until reveal |
| No fraud protection | **Multi-signal fraud detection** — speed analysis, bot detection, plagiarism, resume mismatch |

---

## Core Features

### 1. AI-Powered JD Parsing & Assessment Generation
Recruiters paste a job description → Gemini extracts skills, tools, experience level → generates a full assessment (MCQ + subjective + coding) in seconds. No manual question creation needed.

### 2. Three-Layer Resume Screening
Every candidate must pass resume screening before accessing an assessment:

- **Layer 1 — Rule-Based Pre-Screen (instant):** Hard rejection for experience gaps ≥2 levels, zero skill overlap, or empty/unparseable resumes.
- **Layer 2 — AI Screening (Gemini):** Strict prompt with fraud detection, minimum 40% match threshold, and score capping for under-leveled candidates.
- **Layer 3 — Regex Fallback:** When AI is unavailable (quota exhausted), a pattern-based system extracts 50+ tech skills and scores candidates — no auto-approvals.

### 3. Real-Time AI Proctoring
Client-side AI runs **entirely in the browser** — no server-side video processing:

- **TensorFlow.js + COCO-SSD** for webcam analysis (face count, phone/object detection, gaze direction)
- **DOM event monitoring** for tab switches, copy/paste, right-click, screenshot attempts, mouse leaving the window
- **Three-strike system** with weighted penalties — 3 strikes → auto-submission
- **Integrity score** calculated from all violations with severity-weighted deductions
- **Socket.io live feed** — recruiters watch all active sessions in real time

### 4. Recruiter Live Monitor & Post-Session Reports
- Real-time dashboard showing all active proctoring sessions via WebSocket
- **Time-based attention heat map** — color-coded grid showing when violations occurred during the session
- **Violation timeline** — chronological log of every flagged event
- **7-stat proctoring dashboard** — total violations, integrity score, tab switches, face alerts, gaze tracking, strike count, verdict

### 5. AI Evaluation Engine
- **Objective (MCQ):** Exact match scoring
- **Subjective:** Gemini rubric-based evaluation against expected key points
- **Coding:** AI analyzes logic, correctness, efficiency, and edge case handling

### 6. Multi-Signal Fraud Detection
After submission, the system runs fraud checks:
- **Speed analysis** — flagged if completed in <30 seconds
- **Bot detection** — flagged if >3 repeated submissions
- **Resume mismatch** — flagged if score is extremely low vs. claimed skills
- **Plagiarism** — cross-candidate answer similarity comparison
- **Proctoring violations** — integrated from real-time session data

### 7. Anonymous Hiring Mode
- Candidates appear as **Greek letter aliases** (Alpha, Beta, Gamma...) — no names, emails, or demographics
- AI generates **neutral performance summaries** based purely on scores
- **Bias metrics dashboard** — fairness index, score distribution quartiles, skewness analysis
- Recruiter can **reveal identities** only after making performance-based decisions

### 8. Smart Job Recommendations
100-point scoring algorithm for personalized job matching:
- **Skill matching (60 pts)** — fuzzy matching with alias normalization (e.g., "JS" → "JavaScript")
- **Experience scoring (25 pts)** — level proximity (exact, ±1, ±2)
- **Context matching (15 pts)** — title/description keyword relevance to candidate profile

### 9. Ranking, Leaderboard & Analytics
- Weighted scoring across all question types
- Per-job candidate ranking with percentile calculation
- AI-generated candidate reports with strengths, weaknesses, skill gap analysis, and hiring recommendation

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)             │
│  TypeScript · TailwindCSS · ShadCN UI · TF.js       │
│  App Router · React Hook Form · Axios · Socket.io   │
└──────────────────────┬──────────────────────────────┘
                       │ REST API + WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  Backend (Express.js)                │
│  JWT Auth · RBAC · Rate Limiting · Multer (memory)  │
│  Gemini AI Queue (exponential backoff)              │
├─────────────────┬───────────────┬───────────────────┤
│  AI Services    │  Proctoring   │  Data Layer       │
│  · JD Parser    │  · Socket.io  │  · MongoDB Atlas  │
│  · Assessment   │  · Live Feed  │  · 7 Models       │
│  · Evaluator    │  · Violations │  · Indexed Queries│
│  · Screening    │  · Reports    │                   │
│  · Reports      │               │                   │
│  · Fraud Det.   │               │                   │
└─────────────────┴───────────────┴───────────────────┘
```

**Database Models:** User · Job · Assessment · Attempt · Result · Resume · ProctoringLog

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, TailwindCSS, ShadCN UI |
| Backend | Node.js, Express.js, Socket.io |
| AI/ML | Google Gemini API, TensorFlow.js, COCO-SSD |
| Database | MongoDB Atlas with Mongoose ODM |
| Auth | JWT, bcryptjs, express-validator, role-based access control |
| File Handling | Multer (memory storage), pdf-parse |
| Resilience | express-rate-limit, custom Gemini queue with exponential backoff |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas |

---

## Application Flow

### Recruiter Flow
1. Register/Login → Role-based dashboard
2. Create Job → Paste JD text
3. AI parses JD → Extracts skills, experience, requirements
4. Generate Assessment → AI creates MCQ + subjective + coding questions
5. Toggle Anonymous Mode (optional)
6. Monitor live sessions via WebSocket dashboard
7. View results → Leaderboard, rankings, proctoring reports
8. Download AI-generated candidate analytics reports
9. Reveal candidate identities (if anonymous mode was on)

### Candidate Flow
1. Register/Login → Browse jobs with AI recommendations
2. Click Apply → Redirected to resume upload (mandatory gate)
3. Upload PDF resume → Three-layer screening runs
4. If approved → Access assessment; if rejected → Detailed feedback with reasons
5. Take timed assessment under AI proctoring (webcam + DOM monitoring)
6. Submit → AI evaluates all answers → Fraud detection runs
7. View results → Score, rank, percentile, detailed report

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key

### Backend
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=development
```

```bash
npm run dev   # runs on http://localhost:5000
```

### Frontend
```bash
cd client
npm install
```

Create `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

```bash
npm run dev   # runs on http://localhost:3000
```

---

## API Overview

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Register (candidate/recruiter) |
| `POST /api/auth/login` | Login → JWT token |
| `POST /api/jobs` | Create job (recruiter) |
| `GET /api/jobs/recommended` | AI-powered job recommendations (candidate) |
| `POST /api/assessment/generate/:jobId` | Generate AI assessment |
| `GET /api/assessment/:jobId` | Get assessment (resume gate enforced) |
| `POST /api/resume/upload` | Upload & screen resume |
| `POST /api/attempt/start` | Start proctored attempt |
| `POST /api/attempt/submit` | Submit for AI evaluation |
| `GET /api/results/leaderboard/:jobId` | Rankings & percentiles |
| `GET /api/results/report/:candidateId/:jobId` | AI analytics report |
| `GET /api/proctoring/report/:attemptId` | Proctoring report with heat map |

---

## Team

**Pruthviraj Parmar** · **Maharshi Jani** · **Harsh Manek** · **Riddhi Ladva**

---

## License

MIT

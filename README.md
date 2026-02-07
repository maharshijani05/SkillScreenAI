# AI-Enabled Intelligent Assessment & Hiring Platform

A full-stack AI-powered hiring assessment platform that uses Google Gemini LLM to parse job descriptions, generate assessments, evaluate candidate responses, detect fake applications, and provide comprehensive analytics.

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **ShadCN UI**
- **React Hook Form**
- **Axios**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB** with Mongoose
- **JWT** Authentication
- **Google Gemini API**

## Project Structure

```
.
├── client/                 # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities and API client
│   └── ...
├── server/                # Express backend
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── services/          # Business logic (AI services)
│   ├── middleware/        # Auth, rate limiting
│   └── utils/             # Helper functions
└── README.md
```

## Features

### 1. Authentication System
- JWT-based authentication
- Role-based access control (Admin, Recruiter, Candidate)
- Secure password hashing with bcrypt

### 2. Job Description Management
- Recruiters can create, edit, and delete jobs
- Upload job description text
- Automatic parsing with Gemini AI

### 3. AI-Powered JD Parsing
- Extracts technical skills, soft skills, tools, experience level
- Returns structured JSON data

### 4. Assessment Generation
- Generates objective (MCQ), subjective, and coding questions
- Configurable question counts and duration
- Uses Gemini AI for intelligent question generation

### 5. Candidate Assessment
- Start and submit assessments
- Timer-based assessment
- Answer tracking

### 6. AI Evaluation Engine
- Objective questions: Exact match scoring
- Subjective questions: Gemini rubric-based evaluation
- Coding questions: AI-powered code evaluation with test cases

### 7. Fraud Detection
- Resume vs assessment mismatch detection
- Random attempts detection
- Bot detection
- Plagiarism checking

### 8. Ranking System
- Overall score calculation
- Candidate ranking per job
- Leaderboard generation
- Percentile calculation

### 9. Analytics & Reports
- Comprehensive candidate reports
- Strengths and weaknesses analysis
- Skill gap analysis
- Downloadable reports

### 10. Recruiter Dashboard
- Job management
- Assessment generation
- Results viewing
- Leaderboard
- Report downloads

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (already created with provided credentials):
```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=development
```

4. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file (already created):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Jobs (Recruiter only)
- `POST /api/jobs` - Create job
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Assessment
- `POST /api/assessment/generate/:jobId` - Generate assessment for job
- `GET /api/assessment/:jobId` - Get assessment for job

### Attempts
- `POST /api/attempt/start` - Start assessment attempt
- `POST /api/attempt/submit` - Submit assessment attempt
- `GET /api/attempt` - Get attempts (with query params)

### Results
- `GET /api/results/:jobId` - Get all results for a job
- `GET /api/results/leaderboard/:jobId` - Get leaderboard
- `GET /api/results/report/:candidateId/:jobId` - Get candidate report

## Usage

### For Recruiters

1. **Register/Login** as a recruiter
2. **Create a Job** by providing job title and description
3. **Generate Assessment** - AI will parse the JD and generate questions
4. **View Results** - See candidate rankings and download reports

### For Candidates

1. **Register/Login** as a candidate
2. **Browse Jobs** - View available job postings
3. **Start Assessment** - Take the assessment within the time limit
4. **View Results** - See your score, rank, and percentile

## AI Services

All AI functionality is centralized in:
- `server/services/aiService.js` - Core AI service wrapper
- `server/services/jdParser.js` - Job description parsing
- `server/services/assessmentGenerator.js` - Question generation
- `server/services/evaluationService.js` - Answer evaluation
- `server/services/fraudDetection.js` - Fraud detection
- `server/services/reportService.js` - Report generation

## Security Features

- JWT token-based authentication
- Role-based access control
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation
- MongoDB indexing for performance

## UI/UX

- Modern, sleek dark theme
- Minimal animations (as requested)
- Heavy use of ShadCN UI components
- Responsive design
- Clean and intuitive interface

## Notes

- The coding evaluation uses AI-based assessment. For production, consider implementing a code execution sandbox.
- Fraud detection algorithms can be enhanced with more sophisticated ML models.
- The platform is ready for deployment with proper environment variable configuration.

## License

MIT

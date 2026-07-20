# BFT Prompting Quiz

Multi-industry AI prompt-writing benchmark quiz for BFT Consulting training sessions.

## Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS, deployed on Vercel
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions)
- **Scoring**: OpenRouter API, called server-side via Edge Function (key never exposed to browser)

## Frameworks tested
| Acronym | Full name | Vendor |
|---------|-----------|--------|
| CRAFT | Context, Role, Action, Format, Target/Tone | BFT Consulting |
| GCSE | Goal, Context, Source, Expectations | Microsoft Copilot |
| PTCF | Persona, Task, Context, Format | Google Gemini |
| CRISPE | Context, Role, Instruction, Specification, Performance, Example | Advanced |

## Industries supported
Real Estate, Non-Profit, Telecoms, Banking, Asset Management, Manufacturing — Pharmaceutical, Manufacturing — Livestock, IT / Technology

## Setup

### 1. Environment variables
Copy `.env.example` to `.env` and fill in:
```
VITE_SUPABASE_URL=https://bxuzysywrfzhfwgliluv.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
```

### 2. Supabase Edge Function secrets (one-time, set in Supabase dashboard → Settings → Edge Functions → Secrets)
```
OPENROUTER_KEY=<your fresh OpenRouter API key>
```
⚠️ The old key from the WARIF HTML file is burned — generate a new one at openrouter.ai

### 3. Create facilitator accounts
Facilitators log in via Supabase Auth. Create accounts in Supabase dashboard → Authentication → Users → Invite user.

### 4. Local development
```bash
npm install
npm run dev
```

### 5. Deploy to Vercel
Connect this repo to Vercel. Set the two environment variables in Vercel's project settings. Every push to `main` auto-deploys.

## Adding a new industry
1. Insert a row into the `industries` table
2. Insert scenarios into the `scenarios` table for that industry (status: `draft` → review → `active`)
3. No code changes needed

## Adding a new framework
1. Insert a row into the `frameworks` table  
2. Insert elements into `framework_elements` with correct positions and scoring guidance
3. Add MCQ questions to `mcq_questions` and answer keys to `mcq_answer_keys`
4. No code changes needed

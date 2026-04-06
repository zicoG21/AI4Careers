# AI4Careers

AI-powered career fair assistant for University of Michigan students. Helps students discover companies, match their skills to opportunities, and prepare personalized pitches.

## Tech Stack

- **Backend**: Jac (Jaseci language) `0.12.2`
- **Frontend**: React `19.2.4`, React Router `7.13.1`
- **Database**: SQLite (via Jac's built-in persistence at `.jac/data/`)
- **AI**: OpenAI or Anthropic via byllm `0.5.7` / LiteLLM
- **PDF parsing**: pdfjs-dist `5.5.207` (browser-side)
- **HTTP client**: axios `1.13.6`
- **API**: REST endpoints via Jac walkers

## Current Features

- User signup / login with token-based auth
- Resume upload (PDF → text extraction + PDF stored), preview, download, delete
- Career preferences (sponsorship, work auth, locations, work modes, role types)
- AI chatbot grounded in resume + career fair data
- Career fair company browser (UMich Fall 2025, 230 companies)

## Setup Instructions

### Prerequisites

| Tool | Version used | Notes |
|------|-------------|-------|
| Python | **3.12.8** | Must be 3.12.x — tested with pyenv `3.12.8` |
| Node.js | **23.7.0** | 16+ should work |
| npm | **10.9.2** | comes with Node |
| jaclang | **0.12.2** | installed in venv, 0.12.x should theoretically all work|
| byllm | **0.5.7** | installed in venv |

> **jaclang version is critical.** The walkers were written for `0.12.2`. Other versions may break auth (`walker:pub` visibility) or the `by llm()` syntax.

### 1. Create a virtual environment

```bash
cd AI4Careers
python3 -m venv .venv        # use Python 3.12.x
source .venv/bin/activate
```

### 2. Install Jac and dependencies

Pin the exact versions to match the codebase:

```bash
.venv/bin/pip install "jaclang==0.12.2" "byllm==0.5.7"
```

Verify:
```bash
.venv/bin/jac --version   # should print 0.12.2
.venv/bin/pip show byllm  # should show Version: 0.5.7
```

### 3. Configure your LLM

`jac.toml` is **gitignored** — each developer keeps their own. Copy the example and edit it:

```b
cd AI4Careers
cp jac.toml.example jac.toml
```

Then open `jac.toml` and set your model:

**Using OpenAI** (set `OPENAI_API_KEY` in your environment):
```toml
[plugins.byllm.model]
default_model = "gpt-4o-mini"
```

**Using Anthropic** (set `ANTHROPIC_API_KEY` in your environment):
```toml
[plugins.byllm.model]
default_model = "claude-haiku-4-5-20251001"
```

Set your API key (add to `~/.zshrc` to make it permanent):
```bash
export OPENAI_API_KEY=sk-...        # if using OpenAI
export ANTHROPIC_API_KEY=sk-ant-... # if using Anthropic
```

Each developer uses their own key and model — they do not affect each other.

### 4. Load career fair data

Run once to import the UMich Fall 2025 companies into the database:

```bash
cd AI4Careers
source ../.venv/bin/activate
jac run import_career_fair.jac
```

### 5. Start the backend

```bash
cd AI4Careers
source ../.venv/bin/activate
jac start main.jac --port 8000
```

Backend runs at `http://localhost:8000`

### 6. Start the frontend

```bash
cd AI4Careers/frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

---

## Project Structure

```
AI4Careers/
├── main.jac                  # Entry point, imports all walkers
├── auth.jac                  # Signup, Login, Me, UpdatePreferences walkers
├── resume.jac                # ResumeUpload, GetResume, ListResumes, DeleteResume walkers
├── career_fair.jac           # ListEvents, ListCompanies, GetCompany, ListRoles walkers
├── ai_chat.jac               # ChatWithAI walker
├── db.jac                    # All database operations
├── security.jac              # Password hashing, token management
├── parsing.jac               # Resume parsing — AI skill extraction via byllm
├── import_career_fair.jac    # One-time CSV → DB importer
├── jac.toml                  # Your local config (gitignored)
├── jac.toml.example          # Shared template — copy this to jac.toml
├── data/
│   └── umich_fall_2025_career_fair_jac_ready.csv
└── frontend/
    └── src/
        ├── pages/            # Login, Signup, Dashboard, Profile, ResumeUpload, ChatWithAI, Companies
        ├── context/          # AuthContext
        └── services/         # api.js
```

---

## API Endpoints

All endpoints are `POST /walker/<WalkerName>` at `http://localhost:8000`.

### Auth
| Walker | Fields |
|--------|--------|
| `Signup` | `email`, `password`, `name` |
| `Login` | `email`, `password` → returns `{ token }` |
| `Me` | `token` → returns user profile + resume_count + preferences |
| `UpdatePreferences` | `token`, `needs_sponsorship`, `work_authorization[]`, `preferred_locations[]`, `work_modes[]`, `role_types[]` |

### Resume
| Walker | Fields |
|--------|--------|
| `ResumeUpload` | `token`, `filename`, `raw_text`, `pdf_data` (base64) |
| `GetResume` | `token`, `resume_id` → returns resume + pdf_data |
| `ListResumes` | `token` → returns list of resume metadata |
| `DeleteResume` | `token`, `resume_id` |

### Career Fair
| Walker | Fields |
|--------|--------|
| `ListEvents` | _(none)_ |
| `ListCompanies` | `event_id`, `fair_day`, `position_type`, `sponsors`, `region`, `major_search` |
| `GetCompany` | `event_id`, `company_id` |
| `ListRoles` | `event_id` |

### AI Chat
| Walker | Fields |
|--------|--------|
| `ChatWithAI` | `token`, `question`, `history[]`, `event_id` |

---

## Troubleshooting

**Backend won't start**
- Check Jac version: `.venv/bin/jac --version` (must be **0.12.2** exactly)
- Kill port: `lsof -ti:8000 | xargs kill -9`
- Make sure `jac.toml` exists (copy from `jac.toml.example`)

**AI chat returns random string (e.g. "OhbVrpoiVgRV")**
- `byllm` is not installed in your venv: `.venv/bin/pip install byllm`

**AI chat returns AuthenticationError**
- Your API key is missing or wrong. Check `echo $OPENAI_API_KEY` or `echo $ANTHROPIC_API_KEY`
- Restart the backend after setting the key

**Login not working**
- Clear browser localStorage and try again
- Verify user exists: `sqlite3 .jac/data/AI4Careers.db "SELECT email FROM users;"`

**Resume upload fails**
- Make sure the backend is running and the PDF worker version matches: the `public/pdf.worker.min.mjs` should match the installed `pdfjs-dist` version

---


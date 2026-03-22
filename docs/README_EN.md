# TooMuchCustomers - Full Documentation

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Usage Guide](#usage-guide)
4. [Audio Processing](#audio-processing)
5. [API Reference](#api-reference)
6. [Development](#development)

---

## Installation

### Prerequisites

- Node.js 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- An AI model (local Ollama or OpenAI API key)
- FFmpeg (optional, for audio format conversion)

### Step-by-Step

```bash
# 1. Clone repository
git clone git@github.com:sdxwmlyl/TooMuchCustomers.git
cd TooMuchCustomers

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Start backend (Terminal 1)
cd ../backend
node server.js

# 5. Start frontend (Terminal 2)
cd ../frontend
npm run dev

# 6. Open browser
open http://localhost:5173
```

---

## Configuration

### AI Model Setup

Visit `http://localhost:5173/config` to configure AI models.

#### Option 1: Ollama (Recommended for Privacy)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.2      # For text analysis
ollama pull llava         # For image analysis

# Start Ollama server
ollama serve
```

Configuration:
- Provider: `ollama`
- API URL: `http://localhost:11434`
- Primary Model: `llama3.2`
- Fallback Model: `llava`

#### Option 2: OpenAI API

Configuration:
- Provider: `openai`
- API URL: `https://api.openai.com`
- API Key: `sk-your-key-here`
- Primary Model: `gpt-4`
- Fallback Model: `gpt-3.5-turbo`

### Qwen3ASR Setup (for Audio Processing)

```bash
# Install Qwen3ASR
pip install qwen3asr

# Start Qwen3ASR service
qwen3asr-server --port 8001
```

Configuration:
- Qwen3ASR URL: `http://localhost:8001`

---

## Usage Guide

### Step 1: Create Customer

Click "New Customer" on home page and fill:
- Customer Name (e.g., "ABC Technology Co., Ltd.")
- Contact Person (e.g., "Manager Zhang")
- Industry (Internet/Finance/Education...)

### Step 2: Upload Materials

In customer detail page, click attachment button to upload:
- Chat screenshots (AI auto-extracts text)
- Requirement documents (PDF/TXT)
- Voice recordings (MP3/WAV/M4A)

### Step 3: AI Analysis

Type in chat box:
```
analyze requirements
```

AI will:
1. Read all uploaded materials
2. Extract core requirements
3. Identify implicit needs
4. Output structured analysis report (saved to analysis.md)

### Step 4: Generate Solution

Type:
```
generate solution
```

AI produces:
- Technical solution overview
- Feature module list
- Time estimation (by module)
- Total time and estimated period
- Technical risk warnings

Saved to solution.md, ready to send to customer!

### Step 5: Follow-up Management

Update status via conversation:
```
change status to quoted
```

Or click "Status" button for quick switch.

---

## Audio Processing

### Supported Formats

- MP3
- WAV
- M4A (iPhone recordings)
- FLAC
- OGG

### What Gets Extracted

1. **Full Transcription**: Complete speech-to-text
2. **Speaker Diarization**: Who said what
3. **Q&A Pairs**: Questions from customer, answers from you
4. **Need Extraction**: Automatically identifies:
   - Feature requirements
   - Timeline requirements
   - Budget requirements
   - Technical requirements

### Example Output

```json
{
  "duration": 180,
  "speakers": ["Customer", "Me"],
  "qaPairs": [
    {
      "question": "How long will it take?",
      "answer": "About one month",
      "type": "timeline"
    }
  ],
  "needs": [
    {
      "type": "Feature Requirement",
      "description": "E-commerce platform with payment",
      "priority": "high"
    }
  ]
}
```

---

## API Reference

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/:id` | Get customer details |
| PUT | `/api/customers/:id` | Update customer |
| PUT | `/api/customers/:id/status` | Update status |
| DELETE | `/api/customers/:id` | Delete customer |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers/:id/messages` | Get chat history |
| POST | `/api/customers/:id/messages` | Send message |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/:customerId` | Upload file |
| POST | `/api/audio/:customerId/upload` | Upload audio |
| GET | `/api/audio/:customerId/analysis` | Get audio analysis |

### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/:id/analyze` | Analyze requirements |
| POST | `/api/analysis/:id/solution` | Generate solution |

---

## Development

### Project Structure

```
customer-research-analyzer/
├── backend/
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   │   └── audioService.js  # Qwen3ASR integration
│   └── server.js       # Entry point
├── frontend/
│   ├── src/
│   │   ├── views/      # Page components
│   │   ├── api/        # API clients
│   │   └── stores/     # State management
│   └── package.json
└── data/               # Local data storage
    └── customers/
```

### Adding New Features

1. Backend: Add route in `backend/routes/`
2. Frontend: Add view in `frontend/src/views/`
3. API: Update `frontend/src/api/index.js`
4. Test: Verify with curl or browser

### Environment Variables

```bash
# Backend .env
PORT=8000
DATA_DIR=./data
QWEN3ASR_URL=http://localhost:8001

# Frontend .env
VITE_API_URL=http://localhost:8000
```

---

## Troubleshooting

### Qwen3ASR Connection Failed

If Qwen3ASR service is not available, the system will use mock data for testing.

To enable real processing:
```bash
# Install and start Qwen3ASR
pip install qwen3asr
qwen3asr-server --port 8001
```

### CORS Errors

Make sure backend CORS is configured:
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Database Locked

SQLite doesn't support concurrent writes. If you see "database is locked":
1. Restart backend server
2. Check if multiple processes are accessing the DB

---

## Roadmap

- [ ] Mobile PWA support
- [ ] Email reminders for follow-ups
- [ ] Data dashboard (conversion rates, avg deal size...)
- [ ] Team collaboration (multi-user, permissions)
- [ ] WeChat bot integration
- [ ] Contract generation from solutions

Have ideas? Open an issue!

# Computing 7155 Learning Portal

A comprehensive learning portal for Singapore-Cambridge O-Level Computing (Syllabus 7155) students. Features Python programming environment, spreadsheet practice, and AI tutoring.

## 🚀 Quick Deploy to Railway

**✅ Everything is configured and ready to deploy!**

### 👉 **[START HERE: YOUR_NEXT_STEPS.md](./YOUR_NEXT_STEPS.md)** 👈

**Or jump directly to:**
- 🚀 [Quick Start Guide (10 min)](./QUICK_START_RAILWAY.md) - Recommended!
- 📋 [Deployment Checklist](./DEPLOY_CHECKLIST.md)
- 📚 [Full Railway Guide](./RAILWAY_DEPLOYMENT.md)
- 🎯 [Setup Summary](./RAILWAY_SETUP_SUMMARY.md)
- 🗺️ [Navigation Hub](./START_HERE.md)

## Features

- 🐍 **Python Lab**: Write and run Python code with Jupyter-style notebooks
- 📊 **Spreadsheet Practice**: Excel-like environment with all 7155 required functions
- 🤖 **AI Tutor**: Claude-powered tutor for 24/7 help with any computing topic
- 📚 **Syllabus Browser**: Complete 7155 syllabus with exercises and progress tracking
- 👥 **Student Management**: Authentication, progress tracking, and saved work

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Spreadsheet**: FortuneSheet (Excel-like component)
- **Database**: MongoDB
- **AI**: Anthropic Claude API
- **Authentication**: NextAuth.js
- **Deployment**: Railway

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB instance (local or Atlas)
- Anthropic API key (for AI tutor)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/computing-portal.git
cd computing-portal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
MONGODB_URI=mongodb://localhost:27017/computing-portal
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Account

For testing, you can register a new account or use:
- Email: `student@demo.com`
- Password: `password123`

## Project Structure

```
computing-portal/
├── src/
│   ├── components/       # React components
│   ├── data/            # Syllabus data
│   ├── lib/             # Utilities (MongoDB, auth)
│   ├── models/          # Mongoose models
│   ├── pages/           # Next.js pages & API routes
│   │   ├── api/         # API endpoints
│   │   ├── auth/        # Login/Register pages
│   │   └── ...          # App pages
│   ├── styles/          # Global CSS
│   └── types/           # TypeScript types
├── public/              # Static assets
├── Dockerfile           # Docker config for Railway
├── railway.toml         # Railway deployment config
└── package.json
```

## Deployment on Railway

**🚂 Ready to deploy? Follow our comprehensive guides:**

### Quick Start (10 minutes)
Follow **[QUICK_START_RAILWAY.md](./QUICK_START_RAILWAY.md)** for the fastest deployment.

### Detailed Setup
See **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** for comprehensive instructions with troubleshooting.

### Using CLI
Run the automated setup script:
```bash
./railway-setup.sh
```

### Required Environment Variables
- `MONGODB_URI` - Reference Railway's MongoDB plugin
- `NEXTAUTH_URL` - Your Railway app URL
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` - From https://console.anthropic.com/

**All configuration files are ready!** Just follow the guides above.

## Syllabus Coverage

### Module 1: Computing Fundamentals
- Computer Architecture
- Data Representation (Binary, Hex, Two's Complement)
- Logic Gates & Boolean Algebra

### Module 2: Algorithms and Programming
- Python Programming
- Problem Analysis
- Testing & Debugging
- Algorithm Design

### Module 3: Spreadsheets
- All required functions (VLOOKUP, HLOOKUP, INDEX, MATCH, IF, SUMIF, etc.)
- Conditional Formatting
- Cell References (Relative, Absolute, Mixed)

### Module 4: Networking
- Network Concepts
- Home Networks & Internet
- Security & Privacy

### Module 5: Impact of Computing
- IP & Copyright
- AI & Machine Learning
- Ethics

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth endpoints |
| `/api/auth/register` | POST | User registration |
| `/api/notebooks` | GET, POST | List/create notebooks |
| `/api/notebooks/[id]` | GET, PUT, DELETE | Single notebook operations |
| `/api/spreadsheets` | GET, POST | List/create spreadsheets |
| `/api/spreadsheets/[id]` | GET, PUT, DELETE | Single spreadsheet operations |
| `/api/tutor/chat` | POST | AI tutor chat |
| `/api/user/progress` | GET, PUT | User progress tracking |
| `/api/health` | GET | Health check |

## Future Enhancements

- [ ] JupyterHub integration for full Python execution
- [ ] Goal Seek implementation for spreadsheets
- [ ] Quiz system with auto-grading
- [ ] Teacher dashboard
- [ ] Export to PDF/Excel
- [ ] Peer collaboration features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Singapore Examinations and Assessment Board (SEAB) for the 7155 syllabus
- Anthropic for Claude AI
- FortuneSheet for the spreadsheet component

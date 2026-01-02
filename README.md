# CallInsight AI - Sales Call Intelligence Platform

A fully functional internal prototype for analyzing sales call transcripts using AI. Built with Next.js, PostgreSQL, Prisma, and OpenAI.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-teal)

## 🚀 Features

### ✅ All Core Requirements Implemented

- ✅ **Manual Call Upload** - Paste or upload call transcripts
- ✅ **Dynamic Categories** - Create, edit, and manage call categories
- ✅ **Category-Specific AI Prompts** - Different prompts per category with fallback to global default
- ✅ **AI Analysis & Rating** - Automatic categorization and quality scoring (1-10)
- ✅ **Interactive Dashboard** - Metrics, charts, and analytics
- ✅ **Advanced Filtering** - Filter calls by client, category, organizer
- ✅ **Call Detail View** - Full transcripts with AI insights
- ✅ **Re-analysis** - Re-run AI analysis with updated prompts
- ✅ **Category Override** - Manual category assignment
- ✅ **Dark Theme UI** - Matches the provided design mockups

## 📋 Quick Start

### Option 1: Using Docker PostgreSQL (Recommended for Quick Setup)

```bash
# Start PostgreSQL in Docker
docker run --name callinsight-db -e POSTGRES_PASSWORD=callinsight -e POSTGRES_USER=riddler -e POSTGRES_DB=callinsight -p 5432:5432 -d postgres:16

# Wait a few seconds for DB to start, then proceed with setup
npm install
npm run db:push
npm run db:seed
npm run dev
```

### Option 2: Using Local PostgreSQL

1. **Install PostgreSQL** (if not already installed)
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql@16
   brew services start postgresql@16
   ```

2. **Create Database**
   ```bash
   sudo -u postgres psql -c "CREATE DATABASE callinsight;"
   sudo -u postgres psql -c "CREATE USER riddler WITH PASSWORD 'riddler';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE callinsight TO riddler;"
   ```

3. **Setup Application**
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```

### Option 3: Using Remote PostgreSQL

If you have a remote PostgreSQL instance (e.g., Supabase, Neon, Railway):

1. Create a `.env` file from the example template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` file with your credentials:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   OPENAI_API_KEY="your-openai-api-key"
   SESSION_SECRET="generate-with-openssl-rand-base64-32"
   ADMIN_EMAIL="admin@scandiweb.com"
   ADMIN_PASSWORD="your-secure-password"
   ADMIN_NAME="Admin User"
   ```
   
   Get your OpenAI API key from: https://platform.openai.com/api-keys
   
   Generate a SESSION_SECRET with: `openssl rand -base64 32`

3. Run setup:
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```

## 🔑 Login

After starting the application, navigate to `http://localhost:3000`

**Default admin credentials:**

The admin user credentials are configured via environment variables in your `.env` file:
- `ADMIN_EMAIL` - Admin user email (default: admin@scandiweb.com)
- `ADMIN_PASSWORD` - Admin user password (default: option123!)
- `ADMIN_NAME` - Admin user display name (default: Admin User)

These credentials are used when seeding the database with `npm run db:seed`.

> ⚠️ **Security Note:** Always use strong, unique passwords in production environments!

## 📁 Project Structure

```
callinsight-ai/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Sample data seeder
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/         # Login page
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/     # Analytics dashboard
│   │   │   ├── calls/         # Calls list & detail
│   │   │   ├── prompts/       # AI prompts management
│   │   │   └── categories/    # Categories management
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication
│   │   │   ├── calls/         # Calls CRUD & analysis
│   │   │   ├── prompts/       # Prompts CRUD
│   │   │   └── categories/    # Categories CRUD
│   │   ├── globals.scss       # Global styles
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable components
│   └── lib/
│       ├── prisma.ts          # Prisma client
│       ├── openai.ts          # OpenAI integration
│       └── auth.ts            # Auth utilities
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 Key Features Explained

### 1. Category-Aware AI Prompts

The system supports **category-specific prompts** with intelligent fallback:

1. If a call belongs to a category with an active prompt → use that prompt
2. Otherwise → use the global default prompt

This allows you to customize AI behavior per call type (e.g., different evaluation criteria for "Proposal Calls" vs "Support Calls").

### 2. Manual Call Upload Flow

1. Navigate to **Calls → Upload Call**
2. Fill in:
   - Client name
   - Call date
   - Organizer
   - Participants (comma-separated)
   - Transcript (paste text)
3. Click **Upload & Analyze**
4. AI automatically:
   - Analyzes the transcript
   - Suggests a category
   - Provides a rating (1-10)
   - Generates a summary

### 3. Dashboard Analytics

Real-time metrics and visualizations:
- **Total Calls** - Count of all uploaded calls
- **Analyzed** - Percentage with AI analysis
- **Avg Rating** - Mean quality score
- **Clients** - Unique client count
- **Charts:**
  - Calls by Category (Pie chart)
  - Rating by Client (Horizontal bar)
  - Rating by Organizer (Bar chart)
  - Rating by Category (Bar chart)

### 4. Prompts Management

Create and manage AI evaluation prompts:
- **Global Default** - Used when no category-specific prompt exists
- **Category-Specific** - Custom prompts for specific call types
- **Active/Inactive** - Control which prompts are currently used
- **Version Control** - Keep historical prompts

## 🛠️ Tech Stack Details

### Frontend
- **Next.js 16** with App Router
- **TypeScript** for type safety
- **SCSS Modules** for styling (no Tailwind per requirements)
- **Recharts** for data visualization
- **React Server Components** for performance

### Backend
- **Next.js Server Actions** for mutations
- **API Routes** for REST endpoints
- **Prisma ORM** for database operations
- **PostgreSQL** for data persistence

### AI & Analytics
- **OpenAI GPT-4o-mini** for call analysis
- **Structured JSON responses** for consistent output
- **Category-aware prompt selection**

### Authentication
- **Cookie-based sessions**
- **bcrypt** for password hashing
- **Secure login** with credential verification

## 📊 Sample Data

The seed script creates:

✅ **5 Categories:**
- Proposal Call
- Strategic Planning
- Requirements Gathering
- Feedback / Review
- Status Update

✅ **4 Sample Calls:**
- Acme Corporation (Proposal) - Rating: 9.0
- TechCorp Industries (Requirements) - Rating: 8.0
- Globex Systems (Feedback) - Rating: 6.0
- Initech Solutions (Strategic) - Rating: 10.0

✅ **1 Default AI Prompt:**
```
Analyze this client call transcript and provide:

1. A brief summary of how the call went (2-3 sentences)
2. An overall rating from 1-10 based on:
   - Communication clarity
   - Client engagement
   - Problem resolution
   - Professionalism
   - Outcome achievement
```

## 🧪 Testing the Application

### Test Scenario 1: Upload New Call
1. Login with admin@scandiweb.com / option123! → Navigate to **Calls**
2. Click **Upload Call**
3. Paste this sample transcript:
   ```
   Sales Rep: Hi! Thanks for taking the time today.
   Client: Happy to discuss. Tell me about your solution.
   Sales Rep: We offer a comprehensive platform that solves X, Y, and Z.
   Client: Interesting. What's the pricing?
   Sales Rep: It starts at $500/month for the basic plan.
   Client: Let me think about it and get back to you.
   ```
4. Fill in client name, date, organizer
5. Click **Upload & Analyze**
6. View AI-generated analysis and rating

### Test Scenario 2: Create Category-Specific Prompt
1. Navigate to **Prompts**
2. Click **Create Prompt**
3. Name: "Sales Call Evaluation"
4. Category: Select "Proposal Call"
5. Content:
   ```
   Evaluate this sales call focusing on:
   - Value proposition clarity
   - Objection handling
   - Closing effectiveness
   Rate 1-10 and provide a brief summary.
   ```
6. Save and set as active
7. Upload a new proposal call → will use this prompt

### Test Scenario 3: Dashboard Analytics
1. Upload 5-10 calls with different categories
2. Navigate to **Dashboard**
3. View updated metrics and charts
4. Filter data by client/category

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Push database schema changes
npm run db:push

# Seed database with sample data
npm run db:seed

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (DB GUI)
npx prisma studio
```

## 🐛 Troubleshooting

### "Error: P1001: Can't reach database server"
- PostgreSQL is not running
- Check connection string in `.env`
- Start PostgreSQL: `brew services start postgresql@16` (macOS) or `sudo systemctl start postgresql` (Linux)

### "Error: P3009: Failed to create database"
- Database doesn't exist
- Run: `createdb callinsight` or use Docker option above

### "OpenAI API Error"
- Check API key in `.env`
- Verify OpenAI account has credits
- Check rate limits

### "Module not found" errors
- Run `npm install` again
- Delete `node_modules` and `.next` then reinstall

## 📝 Environment Variables

Required variables in `.env` file:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:port/database"

# OpenAI API key (already configured)
OPENAI_API_KEY="your-api-key"
```

## 🚀 Production Deployment

For production deployment, consider:

1. **Use a managed PostgreSQL service:**
   - Supabase
   - Neon
   - Railway
   - AWS RDS
   - Digital Ocean

2. **Deploy to:**
   - Vercel (recommended for Next.js)
   - Railway
   - Render
   - AWS/GCP/Azure

3. **Environment Setup:**
   - Add production `DATABASE_URL`
   - Enable connection pooling (Prisma Accelerate)
   - Set `NODE_ENV=production`

4. **Security Hardening:**
   - Implement proper authentication (NextAuth, Auth0)
   - Add rate limiting
   - Enable HTTPS
   - Set secure cookie options

## 🔒 Security Best Practices

### Environment Variables
- **NEVER commit `.env` files to git** - they are already in `.gitignore`
- Use `.env.example` as a template (safe to commit)
- Store sensitive credentials only in `.env` (local) or environment variables (production)
- Rotate API keys regularly
- Use different API keys for development and production

### Credentials Management
- Database passwords should be strong and unique
- OpenAI API keys should be kept secret
- In production, use secret management services (AWS Secrets Manager, Azure Key Vault, etc.)
- Never hardcode credentials in source code or documentation

### Git Safety
If you accidentally committed sensitive data:
```bash
# Remove from git history (use with caution)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Or use BFG Repo-Cleaner (recommended)
bfg --delete-files .env
```

Then immediately rotate all exposed credentials!

## 📖 API Documentation

See [SETUP.md](./SETUP.md) for complete API endpoint documentation.

## 🎨 UI/UX Highlights

- **Dark Theme** - Professional, modern interface
- **Responsive Design** - Works on desktop and tablet
- **Intuitive Navigation** - Sidebar with clear sections
- **Interactive Charts** - Recharts for data visualization
- **Loading States** - Proper feedback during async operations
- **Error Handling** - User-friendly error messages

## 🏗️ Architecture Decisions

### Why PostgreSQL?
- Required by specifications
- Robust, production-ready
- Excellent Prisma support
- Advanced querying capabilities

### Why No Tailwind?
- Per user requirements (SCSS only)
- SCSS modules for component isolation
- CSS variables for theming
- Better for custom design systems

### Why OpenAI GPT-4o-mini?
- Cost-effective for demos
- Fast response times
- Structured JSON output support
- Good analysis quality

### Why Server Components?
- Better performance (less JS to client)
- Direct database access in components
- SEO-friendly
- Simpler data fetching

## 🤝 Contributing

This is an internal prototype. For production use:
- Add comprehensive testing (Jest, Playwright)
- Implement CI/CD pipeline
- Add monitoring and logging
- Improve error handling
- Add input validation
- Implement rate limiting

## 📄 License

Internal use only - not licensed for distribution.

---

**Built with ❤️ for efficient sales call analysis**

For questions or issues, refer to [SETUP.md](./SETUP.md) or contact the development team.

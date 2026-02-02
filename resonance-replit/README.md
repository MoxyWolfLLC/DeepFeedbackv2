# Resonance - AI-Led Qualitative Research Platform

Adaptive conversational surveys powered by AI, rebuilt with the V4 stack.

## Tech Stack

- **Frontend:** Next.js 14 + TypeScript + Tailwind + shadcn/ui
- **API:** tRPC
- **Database:** Supabase (PostgreSQL) + Prisma
- **LLM:** OpenRouter (Claude, GPT-4, Gemini, etc.)
- **Hosting:** Replit / Vercel

## Setup Instructions

### 1. Create New Replit

1. Go to [replit.com](https://replit.com)
2. Click **+ Create Repl**
3. Choose **Node.js** template (not Next.js - we have our own config)
4. Upload all files from this folder

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Secrets

In Replit, go to **Tools → Secrets** and add:

| Secret | Value | Required |
|--------|-------|----------|
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Yes |
| `DATABASE_URL` | `postgresql://...?pgbouncer=true` | Yes |
| `DIRECT_URL` | `postgresql://...` | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Yes |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Optional |

### 4. Setup Database

```bash
npx prisma db push
npx prisma generate
```

### 5. Run Development Server

```bash
npm run dev
```

## Project Structure

```
resonance-replit/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Dashboard
│   │   ├── providers.tsx       # React Query + tRPC
│   │   └── api/trpc/           # tRPC API handler
│   ├── components/ui/          # shadcn/ui components
│   ├── lib/
│   │   ├── prisma.ts           # Database client
│   │   ├── supabase.ts         # Supabase client
│   │   ├── openrouter.ts       # LLM client
│   │   ├── prompts.ts          # AI prompts
│   │   ├── utils.ts            # Utilities
│   │   └── trpc/               # tRPC setup
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── routers/        # API routers
│   ├── hooks/                  # Custom hooks
│   └── types/                  # TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── .replit                     # Replit config
├── replit.nix                  # Nix packages
└── package.json
```

## Key Features

### Planning Module
- Create research rubrics from goals
- AI-generated interview questions
- Opening/closing scripts

### Interview Module
- Adaptive ARP methodology conversations
- Real-time message streaming
- Shareable interview links

### Analysis Module
- Theme extraction from completed interviews
- Confidence scores and insights
- Actionable recommendations

## Adding More shadcn/ui Components

```bash
npx shadcn@latest add dialog
npx shadcn@latest add tabs
npx shadcn@latest add select
```

## Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npx prisma studio    # Visual database editor
npx prisma db push   # Push schema changes
```

## Next Steps

1. [ ] Add `/rubrics/new` page for creating rubrics
2. [ ] Add `/rubrics/[id]` page for rubric details
3. [ ] Add `/interview/[token]` page for conducting interviews
4. [ ] Add `/rubrics/[id]/analysis` page for viewing analysis
5. [ ] Integrate Council MCP for multi-model analysis
6. [ ] Add Resend for email invitations

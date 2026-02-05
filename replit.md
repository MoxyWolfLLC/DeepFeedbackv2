# Resonance - AI-Led Qualitative Research Platform

## Overview

Resonance is an AI-powered qualitative research platform that enables adaptive conversational surveys. The application allows researchers to create interview "rubrics" with AI-generated questions, conduct automated interviews with participants, and analyze responses using LLM-powered analysis.

The core workflow is:
1. Researchers define research goals and the system generates interview questions using AI
2. Shareable interview links are created for participants
3. AI conducts adaptive interviews using an ARP (Acknowledgment, Reflection, Probe) methodology
4. When enough interviews are complete, AI analyzes responses to extract themes and insights

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with App Router (React Server Components enabled)
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **State Management**: TanStack React Query for server state, local React state for UI
- **Type Safety**: Full TypeScript throughout with Zod schemas for runtime validation

### Backend Architecture
- **API Layer**: tRPC for end-to-end type-safe APIs between client and server
- **API Routes**: Next.js API routes at `/api/trpc/[trpc]` handle all tRPC requests
- **Data Transformation**: SuperJSON for serializing complex types (dates, etc.) over the wire
- **Procedure Types**: Public procedures (currently no auth) with protected procedure scaffolding ready

### Data Layer
- **ORM**: Prisma for database access with type-safe queries
- **Database**: PostgreSQL via Supabase (requires `DATABASE_URL` and `DIRECT_URL` for connection pooling)
- **Schema**: Rubrics → Interviews → Messages hierarchy, plus AnalysisJobs for async processing

### Core Domain Models
- **Rubric**: Research project containing goals, AI-generated questions, and interview scripts
- **Interview**: Individual participant session with access token for shareable links
- **Message**: Conversation turns with role (USER/ASSISTANT/SYSTEM) and ARP phase tracking
- **AnalysisJob**: Async analysis results containing themes, insights, and recommendations

### LLM Integration
- **Provider**: OpenRouter as unified gateway to multiple LLM providers
- **Models Supported**: GPT-4o, Claude Sonnet, Gemini, Grok, Llama
- **Use Cases**: Question generation, interview script creation, adaptive interview responses, analysis
- **Prompt Engineering**: Structured prompts in `/src/lib/prompts.ts` for consistent AI behavior

### Key Patterns
- Client-side tRPC hooks for data fetching with React Query caching
- Server-side context injection for database access in procedures
- JSON storage for flexible question/analysis data structures in Prisma
- Token-based interview access for anonymous participant links

## External Dependencies

### Required Services
| Service | Purpose | Environment Variables |
|---------|---------|----------------------|
| **Supabase** | PostgreSQL database hosting | `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **OpenRouter** | LLM API gateway | `OPENROUTER_API_KEY` |

### Optional Services
| Service | Purpose | Environment Variables |
|---------|---------|----------------------|
| **Supabase Admin** | Server-side operations with elevated permissions | `SUPABASE_SERVICE_KEY` |

### Database Setup
Run `npx prisma db push` to sync schema and `npx prisma generate` to generate client types.

### Key NPM Dependencies
- `@prisma/client` - Database ORM
- `@trpc/*` - Type-safe API layer
- `@tanstack/react-query` - Server state management
- `@supabase/supabase-js` - Supabase client (available but Prisma is primary data access)
- `@radix-ui/*` - Accessible UI primitives
- `zod` - Schema validation

## Interview Methodology

### The Mom Test Integration
The interview system is built on principles from "The Mom Test" book (reference material in `/the_mom_test/` directory). Key principles:

1. **Facts over opinions**: Questions focus on past behaviors, not hypothetical futures
2. **Specifics over generics**: When participants say "usually" or "always", the AI anchors to specific examples
3. **Dig into emotions**: Strong feelings indicate important topics to explore
4. **Deflect compliments**: Redirect vague praise to concrete specifics
5. **Anchor fluff**: Convert hypotheticals ("I would...") into real examples ("When did you last...")

### Question Generation
Questions are designed to:
- Ask about past experiences, not future intentions
- Use patterns like "Talk me through the last time..." and "How are you dealing with this now?"
- Avoid leading questions that suggest the "right" answer
- Include at least one question that could disprove the hypothesis

### Interview AI Behavior
The AI interviewer:
- Uses ARP methodology (Acknowledge, Reflect, Probe)
- Probes deeper when answers are vague or generic
- Treats lukewarm responses as valuable data
- Seeks disconfirming evidence, not just validation
- Tracks turn counts with urgency warnings (NORMAL at 14+, SOON at 6, URGENT at 3 turns left)
- Delivers closing script when max turns reached

## Export Functionality

### Transcript Export
- **Location**: Rubrics detail page → Recent Interviews section
- **Selection**: Checkbox per completed interview, Select All/Deselect All buttons
- **Format**: Multi-sheet Excel (.xlsx) with Summary, Individual interview sheets, and Combined transcript
- **API Route**: `/api/export/transcripts` (POST)

### Analysis Export
- **Location**: Analysis page → Export dropdown menu
- **Formats Available**:
  - Markdown (.md) - Full analysis report with themes, insights, and recommendations
  - PowerPoint (.pptx) - Professional presentation with title, themes, insights, and recommendations slides
- **API Routes**: `/api/export/analysis/markdown`, `/api/export/analysis/slides` (POST)

### Key Dependencies for Export
- `xlsx` - Excel file generation for transcripts
- `pptxgenjs` - PowerPoint file generation for analysis presentations
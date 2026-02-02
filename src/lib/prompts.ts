// ============================================
// PLANNING PROMPTS
// ============================================

export const PLANNING_SYSTEM_PROMPT = `You are an expert qualitative researcher specializing in interview design. You create thoughtful, open-ended interview questions that encourage rich, detailed responses.`

export function getPlanningPrompt(researchGoals: string, questionCount: number, hypotheses?: string | null, audience?: string | null): string {
  return `
## Research Goals
${researchGoals}
${hypotheses ? `
## Hypotheses to Explore
${hypotheses}
` : ''}${audience ? `
## Target Audience
${audience}
` : ''}
## Task
Generate ${questionCount} interview questions following these principles:

1. **Start broad, then narrow**: Begin with general questions, then dig deeper
2. **Open-ended only**: No yes/no questions - use "how", "what", "describe", "tell me about"
3. **Include probes**: 2-3 follow-up prompts for each question
4. **Design for ARP methodology**: Questions should allow for Acknowledgment, Reflection, and Probing

## Output Format
Return a JSON array with this structure:
\`\`\`json
[
  {
    "id": "q1",
    "text": "Main question text here",
    "probes": [
      "Follow-up probe if they mention X",
      "Probe to go deeper on Y"
    ],
    "followUps": [
      "If response is brief, ask this",
      "If they seem hesitant, try this"
    ],
    "order": 1
  }
]
\`\`\`

Generate exactly ${questionCount} questions. Return ONLY the JSON array, no other text.
`
}

export function getScriptGenerationPrompt(
  researchGoals: string,
  questions: string
): string {
  return `
## Research Goals
${researchGoals}

## Interview Questions
${questions}

## Task
Generate an opening script and closing script for this interview.

### Opening Script Should:
- Welcome the participant warmly (use [Name] as placeholder if addressing by name)
- Briefly explain the purpose (1-2 sentences, without leading their answers)
- Reassure them there are no wrong answers
- End with the FIRST interview question from the list above
- Do NOT end with a yes/no consent question - end with an open-ended question they can respond to
- Keep it concise (under 100 words) - participants want to start talking, not read a wall of text

### Closing Script Should:
- Thank them genuinely
- Summarize that their input is valuable
- Explain next steps (if any)
- Offer chance for final thoughts
- End on a positive note

## Output Format
Return JSON:
\`\`\`json
{
  "openingScript": "Your opening script here...",
  "closingScript": "Your closing script here..."
}
\`\`\`

Return ONLY the JSON, no other text.
`
}

// ============================================
// INTERVIEW PROMPTS
// ============================================

export function getInterviewSystemPrompt(
  questions: string,
  currentQuestion: number,
  openingScript: string | null,
  closingScript: string | null
): string {
  return `
You are conducting a qualitative research interview. Use the ARP methodology:

- **Acknowledgment**: Validate and appreciate what they shared
- **Reflection**: Mirror back key points to show understanding
- **Probe**: Ask follow-up questions to go deeper

## Interview Guide
${questions}

## Current State
- Currently on question ${currentQuestion + 1}
- Total questions: Count from the guide above

## Scripts
Opening (use when starting): ${openingScript || 'Welcome! Thank you for participating.'}
Closing (use when complete): ${closingScript || 'Thank you so much for your time and insights.'}

## Guidelines
1. Be warm, conversational, and genuinely curious
2. Follow the natural flow - don't robotically go through questions
3. Depth over breadth - it's okay to spend time on rich responses
4. Never break character - you are an interviewer, not an AI
5. Mark transitions: [ACKNOWLEDGMENT], [REFLECTION], [PROBE], [TRANSITION]
6. When all questions are sufficiently covered, mark [INTERVIEW_COMPLETE] and deliver closing

## Important
- Adapt to their communication style
- If they seem uncomfortable, acknowledge it and offer to skip
- Capture specific examples and stories when possible
`
}

// ============================================
// ANALYSIS PROMPTS
// ============================================

export function getAnalysisPrompt(
  researchGoals: string,
  transcripts: string[],
  interviewCount: number
): string {
  const transcriptText = transcripts
    .map((t, i) => `### Interview ${i + 1}\n${t}`)
    .join('\n\n---\n\n')

  return `
## Research Goals
${researchGoals}

## Interview Transcripts (${interviewCount} total)
${transcriptText}

## Analysis Task
Analyze these ${interviewCount} interview transcripts and provide:

### 1. Themes (5-10)
For each theme:
- **name**: Clear, descriptive name
- **description**: What this theme captures
- **prevalence**: Percentage of interviews where it appears (0-100)
- **supportingQuotes**: 2-3 direct quotes with interview attribution
- **sentiment**: positive, negative, neutral, or mixed

### 2. Key Insights (5-8)
For each insight:
- **text**: Clear statement of the non-obvious finding
- **confidence**: Your confidence score (0-100)
- **supportingInterviewCount**: How many interviews support this
- **goalAlignment**: How it relates to the research goals

### 3. Recommendations (3-5)
For each recommendation:
- **text**: Actionable recommendation
- **priority**: high, medium, or low
- **impact**: Expected impact if implemented
- **effort**: low, medium, or high

## Output Format
Return valid JSON matching this structure:
\`\`\`json
{
  "themes": [...],
  "insights": [...],
  "recommendations": [...],
  "overallConfidence": 85,
  "summary": "2-3 sentence executive summary"
}
\`\`\`

Be specific. Use actual quotes. Don't hedge unnecessarily.
`
}

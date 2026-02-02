'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc/client'

export default function NewRubricPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [researchGoals, setResearchGoals] = useState('')
  const [hypotheses, setHypotheses] = useState('')
  const [audience, setAudience] = useState('')
  const [questionCount, setQuestionCount] = useState(5)

  const createRubric = trpc.rubric.create.useMutation({
    onSuccess: (rubric) => {
      router.push(`/rubrics/${rubric.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createRubric.mutate({ 
      title, 
      researchGoals, 
      hypotheses: hypotheses || undefined,
      audience: audience || undefined,
      questionCount 
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Research Project</CardTitle>
            <CardDescription>
              Define your research goals and we'll generate an adaptive interview rubric.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Customer Onboarding Experience Study"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Research Goals */}
              <div className="space-y-2">
                <Label htmlFor="goals">Research Goals</Label>
                <Textarea
                  id="goals"
                  placeholder="Describe what you want to learn from participants. Be specific about the insights you're seeking.

Example: We want to understand how new customers experience our onboarding process, identify pain points and moments of confusion, and discover what would make the process feel more intuitive and valuable."
                  value={researchGoals}
                  onChange={(e) => setResearchGoals(e.target.value)}
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The more specific your goals, the better the generated questions.
                </p>
              </div>

              {/* Hypotheses */}
              <div className="space-y-2">
                <Label htmlFor="hypotheses">Hypotheses (Optional)</Label>
                <Textarea
                  id="hypotheses"
                  placeholder="What do you believe might be true? What assumptions do you want to validate or challenge?

Example: We believe users abandon onboarding because they don't understand the value proposition. We suspect the tutorial is too long and users lose interest."
                  value={hypotheses}
                  onChange={(e) => setHypotheses(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Sharing your hypotheses helps generate questions that explore and test your assumptions.
                </p>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience (Optional)</Label>
                <Textarea
                  id="audience"
                  placeholder="Who are you interviewing? Describe the participant profile.

Example: New users who signed up in the last 30 days, completed less than 50% of onboarding, and have not made a purchase yet."
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Defining your audience helps tailor questions to their perspective and experience.
                </p>
              </div>

              {/* Question Count */}
              <div className="space-y-2">
                <Label htmlFor="count">Number of Questions</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="count"
                    type="number"
                    min={3}
                    max={15}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    (3-15 questions recommended)
                  </span>
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-4 pt-4">
                <Link href="/">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={createRubric.isPending || !title || !researchGoals}
                >
                  {createRubric.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Interview Rubric
                    </>
                  )}
                </Button>
              </div>

              {createRubric.error && (
                <p className="text-sm text-destructive">
                  {createRubric.error.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

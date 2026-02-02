'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc/client'

export default function EditRubricPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  
  const { data: rubric, isLoading } = trpc.rubric.get.useQuery({ id })
  const updateMutation = trpc.rubric.update.useMutation({
    onSuccess: () => {
      router.push(`/rubrics/${id}`)
    },
  })

  const [title, setTitle] = useState('')
  const [researchGoals, setResearchGoals] = useState('')
  const [hypotheses, setHypotheses] = useState('')
  const [audience, setAudience] = useState('')

  useEffect(() => {
    if (rubric) {
      setTitle(rubric.title)
      setResearchGoals(rubric.researchGoals)
      setHypotheses(rubric.hypotheses || '')
      setAudience(rubric.audience || '')
    }
  }, [rubric])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      id,
      title,
      researchGoals,
      hypotheses: hypotheses || undefined,
      audience: audience || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!rubric) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Rubric not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href={`/rubrics/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Research Project</CardTitle>
            <CardDescription>
              Update the details of your research project. Note: Changing research goals may require regenerating questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Customer Satisfaction Study"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="researchGoals">Research Goals</Label>
                <Textarea
                  id="researchGoals"
                  value={researchGoals}
                  onChange={(e) => setResearchGoals(e.target.value)}
                  placeholder="Describe what you want to learn from this research..."
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about what insights you're hoping to gather.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hypotheses">Hypotheses (Optional)</Label>
                <Textarea
                  id="hypotheses"
                  value={hypotheses}
                  onChange={(e) => setHypotheses(e.target.value)}
                  placeholder="What do you expect to find? List your hypotheses..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Share any assumptions or expected outcomes you want to test.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience (Optional)</Label>
                <Textarea
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Describe who will be participating in these interviews..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Define your ideal participants to help tailor the interview questions.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Link href={`/rubrics/${id}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>

              {updateMutation.error && (
                <p className="text-sm text-red-600">
                  Error: {updateMutation.error.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, BarChart3, Share2, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc/client'

export default function RubricDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: rubric, isLoading, refetch } = trpc.rubric.get.useQuery({ id })

  const regenerate = trpc.rubric.regenerateQuestions.useMutation({
    onSuccess: () => refetch(),
  })

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

  const questions = rubric.questions as any[] || []
  const interviewUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/interview/[token]`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Title & Actions */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{rubric.title}</h1>
            <p className="text-muted-foreground mt-1">{rubric.researchGoals}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Link href={`/rubrics/${id}/analysis`}>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analysis
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{questions.length}</div>
              <p className="text-sm text-muted-foreground">Questions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rubric._count.interviews}</div>
              <p className="text-sm text-muted-foreground">Interviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rubric._count.analysisJobs}</div>
              <p className="text-sm text-muted-foreground">Analyses</p>
            </CardContent>
          </Card>
        </div>

        {/* Questions */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Interview Questions</CardTitle>
              <CardDescription>
                Generated from your research goals
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerate.mutate({ id })}
              disabled={regenerate.isPending}
            >
              {regenerate.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Regenerate
            </Button>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <p className="text-muted-foreground">
                Questions are being generated...
              </p>
            ) : (
              <div className="space-y-6">
                {questions.map((q: any, idx: number) => (
                  <div key={q.id || idx} className="border-l-2 border-primary pl-4">
                    <p className="font-medium">
                      {idx + 1}. {q.text}
                    </p>
                    {q.probes && q.probes.length > 0 && (
                      <div className="mt-2 ml-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Probes
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {q.probes.map((probe: string, i: number) => (
                            <li key={i}>• {probe}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Interviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Interviews</CardTitle>
              <CardDescription>
                Participants who have taken this interview
              </CardDescription>
            </div>
            <Button size="sm">
              <Users className="w-4 h-4 mr-2" />
              Invite Participants
            </Button>
          </CardHeader>
          <CardContent>
            {rubric.interviews.length === 0 ? (
              <p className="text-muted-foreground">
                No interviews yet. Share the link to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {rubric.interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {interview.participantName || 'Anonymous'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {interview.participantEmail || 'No email'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        interview.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : interview.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {interview.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

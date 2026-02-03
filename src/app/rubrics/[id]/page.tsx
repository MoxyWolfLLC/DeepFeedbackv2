'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Share2, RefreshCw, Loader2, Pencil, Trash2, X, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { trpc } from '@/lib/trpc/client'
import { ShareModal } from '@/components/share-modal'

export default function RubricDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null)
  const { data: rubric, isLoading, refetch } = trpc.rubric.get.useQuery({ id })

  const regenerate = trpc.rubric.regenerateQuestions.useMutation({
    onSuccess: () => refetch(),
  })

  const deleteMutation = trpc.rubric.delete.useMutation({
    onSuccess: () => {
      router.push('/')
    },
  })

  const deleteInterviewMutation = trpc.interview.delete.useMutation({
    onSuccess: () => {
      setInterviewToDelete(null)
      refetch()
    },
  })

  const handleDelete = () => {
    deleteMutation.mutate({ id })
  }

  const handleDeleteInterview = () => {
    if (interviewToDelete) {
      deleteInterviewMutation.mutate({ id: interviewToDelete })
    }
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

  const questions = rubric.questions as any[] || []
  const completedInterviews = rubric.interviews.filter(i => i.status === 'COMPLETED').length
  const canAnalyze = completedInterviews >= 5

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
            <Link href={`/rubrics/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Research Project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{rubric.title}" and all associated interviews and data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" onClick={() => setShareModalOpen(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            {canAnalyze ? (
              <Link href={`/rubrics/${id}/analysis`}>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analysis
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled title={`Need ${5 - completedInterviews} more completed interviews`}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analysis
              </Button>
            )}
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
              <div className="text-2xl font-bold">
                {completedInterviews}
                {!canAnalyze && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    / 5 needed
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
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
            <Button size="sm" onClick={() => setShareModalOpen(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share Interview
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
                    className="flex items-center justify-between py-2 border-b last:border-0 group"
                  >
                    <div>
                      <p className="font-medium">
                        {interview.participantName || 'Anonymous'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {interview.participantEmail || 'No email'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Link href={`/interviews/${interview.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="View responses"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        onClick={() => setInterviewToDelete(interview.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        rubricId={id}
        rubricTitle={rubric.title}
      />

      {/* Delete Interview Dialog */}
      <AlertDialog open={!!interviewToDelete} onOpenChange={(open) => !open && setInterviewToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this interview response and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInterview}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteInterviewMutation.isPending}
            >
              {deleteInterviewMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Loader2, Send, Check, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { trpc } from '@/lib/trpc/client'

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>()
  const [message, setMessage] = useState('')
  const [isInitializing, setIsInitializing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [summaryFeedback, setSummaryFeedback] = useState('')
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: interview, isLoading, refetch } = trpc.interview.getByToken.useQuery(
    { token },
    { enabled: !!token }
  )

  const initializeInterview = trpc.interview.initialize.useMutation({
    onSuccess: () => {
      refetch()
      setIsInitializing(false)
    },
    onError: () => {
      setIsInitializing(false)
    },
  })

  const sendMessage = trpc.interview.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('')
      refetch()
    },
  })

  const submitFeedback = trpc.interview.submitSummaryFeedback.useMutation({
    onSuccess: (data) => {
      if (data.revised) {
        refetch()
        setSummaryFeedback('')
        setIsEditingSummary(false)
      } else {
        refetch()
      }
    },
  })

  const confirmSummary = trpc.interview.confirmSummary.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const submitAttribution = trpc.interview.submitAttribution.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  useEffect(() => {
    if (interview && interview.messages.length === 0 && !isInitializing && interview.status !== 'COMPLETED') {
      setIsInitializing(true)
      initializeInterview.mutate({ interviewId: interview.id })
    }
  }, [interview, isInitializing])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [interview?.messages])

  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
          {isInitializing && (
            <p className="mt-4 text-muted-foreground">Starting your interview...</p>
          )}
        </div>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium">Interview not found</p>
            <p className="text-muted-foreground mt-2">
              This interview link may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const phase = (interview as any).phase || 'QUESTIONS'
  const summary = (interview as any).summary || ''
  const questionCount = interview.rubric.questionCount
  const questionsAsked = (interview as any).questionsAsked || 0
  const progress = Math.min((questionsAsked / questionCount) * 100, 100)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sendMessage.isPending) return

    sendMessage.mutate({
      interviewId: interview.id,
      content: message.trim(),
    })
  }

  const handleConfirmSummary = () => {
    confirmSummary.mutate({ interviewId: interview.id })
  }

  const handleSubmitCorrection = () => {
    if (!summaryFeedback.trim()) return
    submitFeedback.mutate({
      interviewId: interview.id,
      feedback: summaryFeedback.trim(),
      isCorrect: false,
    })
  }

  const handleSubmitAttribution = (anonymous: boolean) => {
    submitAttribution.mutate({
      interviewId: interview.id,
      firstName: anonymous ? undefined : firstName || undefined,
      lastName: anonymous ? undefined : lastName || undefined,
      email: anonymous ? undefined : email || undefined,
      stayAnonymous: anonymous,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-semibold">{interview.rubric.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground">
              {phase === 'QUESTIONS' 
                ? `Question ${questionsAsked} of ${questionCount}`
                : phase === 'SUMMARIZING' || phase === 'REVIEWING'
                ? 'Summarizing'
                : phase === 'ATTRIBUTION'
                ? 'Almost done'
                : 'Complete'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {interview.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === 'USER'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white border shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {sendMessage.isPending && (
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm rounded-lg px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t p-4">
        <div className="max-w-2xl mx-auto">
          {phase === 'QUESTIONS' && interview.status !== 'COMPLETED' && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 resize-none min-h-[80px]"
                disabled={sendMessage.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="h-auto"
                disabled={!message.trim() || sendMessage.isPending}
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
          )}

          {(phase === 'SUMMARIZING' || (sendMessage.isPending && questionsAsked >= questionCount)) && (
            <Card>
              <CardContent className="py-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Preparing your summary...</p>
                <p className="text-muted-foreground mt-2">
                  I'm reviewing our conversation to capture what you shared.
                </p>
              </CardContent>
            </Card>
          )}

          {phase === 'REVIEWING' && summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Here's what I heard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                  {summary}
                </div>

                {!isEditingSummary ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={handleConfirmSummary}
                      className="flex-1"
                      disabled={confirmSummary.isPending}
                    >
                      {confirmSummary.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Yes, that's accurate
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsEditingSummary(true)}
                      className="flex-1"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      I'd like to correct something
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label htmlFor="correction">What would you like to correct or add?</Label>
                    <Textarea
                      id="correction"
                      value={summaryFeedback}
                      onChange={(e) => setSummaryFeedback(e.target.value)}
                      placeholder="Tell me what I got wrong or missed..."
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSubmitCorrection}
                        disabled={!summaryFeedback.trim() || submitFeedback.isPending}
                        className="flex-1"
                      >
                        {submitFeedback.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Submit Correction
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsEditingSummary(false)
                          setSummaryFeedback('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {phase === 'ATTRIBUTION' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">One last thing...</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Would you like to provide your name and email so we can attribute your insights? 
                  This is completely optional - you can stay anonymous if you prefer.
                </p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jane"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email (optional - to receive results)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleSubmitAttribution(false)}
                      disabled={(!firstName || !lastName) || submitAttribution.isPending}
                      className="flex-1"
                    >
                      {submitAttribution.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Submit with my name
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSubmitAttribution(true)}
                      disabled={submitAttribution.isPending}
                      className="flex-1"
                    >
                      Stay anonymous
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(phase === 'DONE' || interview.status === 'COMPLETED') && (
            <Card>
              <CardContent className="py-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-lg font-medium text-green-600">
                  Thank you for completing this interview!
                </p>
                <p className="text-muted-foreground mt-2">
                  Your responses have been recorded and will help inform our research.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </footer>
    </div>
  )
}

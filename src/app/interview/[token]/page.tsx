'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Loader2, Send, Check } from 'lucide-react'
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
  const [showOptIn, setShowOptIn] = useState(true)
  const [optInSubmitted, setOptInSubmitted] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
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

  const optIn = trpc.interview.optInForResults.useMutation({
    onSuccess: () => {
      setOptInSubmitted(true)
      refetch()
    },
  })

  // Auto-initialize if interview has no messages
  useEffect(() => {
    if (interview && interview.messages.length === 0 && !isInitializing && interview.status !== 'COMPLETED') {
      setIsInitializing(true)
      initializeInterview.mutate({ interviewId: interview.id })
    }
  }, [interview, isInitializing])

  // Auto-scroll to bottom when messages change
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

  const questions = (interview.rubric.questions as any[]) || []
  const progress = interview.turnCount > 0
    ? Math.min((interview.turnCount / interview.maxTurns) * 100, 100)
    : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sendMessage.isPending) return

    sendMessage.mutate({
      interviewId: interview.id,
      content: message.trim(),
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-semibold">{interview.rubric.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground">
              {interview.turnCount} / {interview.maxTurns}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
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

      {/* Input */}
      <footer className="bg-white border-t p-4">
        <div className="max-w-2xl mx-auto">
          {interview.status === 'COMPLETED' ? (
            <Card>
              <CardContent className="py-6">
                <div className="text-center mb-6">
                  <p className="text-lg font-medium text-green-600">
                    Thank you for completing this interview!
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Your responses have been recorded.
                  </p>
                </div>

                {/* Results Opt-in */}
                {showOptIn && !optInSubmitted && !interview.wantsResults && (
                  <div className="border-t pt-6">
                    <p className="text-center font-medium mb-4">
                      Would you like to receive the overall research results when they're ready?
                    </p>
                    <div className="space-y-4 max-w-sm mx-auto">
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
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@example.com"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            if (firstName && lastName && email) {
                              optIn.mutate({
                                interviewId: interview.id,
                                firstName,
                                lastName,
                                email,
                              })
                            }
                          }}
                          disabled={!firstName || !lastName || !email || optIn.isPending}
                        >
                          {optIn.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Yes, send me the results
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowOptIn(false)}
                        >
                          No thanks
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirmation after opt-in */}
                {(optInSubmitted || interview.wantsResults) && (
                  <div className="border-t pt-6 text-center">
                    <div className="inline-flex items-center gap-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span>We'll send you the results when they're ready!</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
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
        </div>
      </footer>
    </div>
  )
}

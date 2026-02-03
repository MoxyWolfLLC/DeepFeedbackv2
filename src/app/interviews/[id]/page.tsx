'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, User, Bot } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc/client'

export default function InterviewTranscriptPage() {
  const { id } = useParams<{ id: string }>()
  const { data: interview, isLoading } = trpc.interview.getById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Interview not found</p>
      </div>
    )
  }

  const userMessages = interview.messages.filter(m => m.role === 'USER')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href={`/rubrics/${interview.rubric.id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {interview.rubric.title}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Interview Transcript</CardTitle>
            <CardDescription>
              {interview.participantName || 'Anonymous'} 
              {interview.participantEmail && ` • ${interview.participantEmail}`}
              {' • '}
              <span className={`${
                interview.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'
              }`}>
                {interview.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
              </span>
              {' • '}
              {userMessages.length} response{userMessages.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Conversation */}
        <div className="space-y-4">
          {interview.messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'USER' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role !== 'USER' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'USER'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white border shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.role === 'USER' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
              {message.role === 'USER' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        {interview.messages.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No messages yet. This interview hasn't started.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

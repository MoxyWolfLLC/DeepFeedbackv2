'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

function StartInterviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rubricId = searchParams.get('rubric')

  const createLink = trpc.interview.createLink.useMutation({
    onSuccess: (data) => {
      router.replace(`/interview/${data.token}`)
    },
  })

  useEffect(() => {
    if (rubricId && !createLink.isPending && !createLink.isSuccess) {
      createLink.mutate({ rubricId })
    }
  }, [rubricId])

  if (!rubricId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid interview link</p>
      </div>
    )
  }

  if (createLink.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Error: {createLink.error.message}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Preparing your interview...</p>
      </div>
    </div>
  )
}

export default function StartInterviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <StartInterviewContent />
    </Suspense>
  )
}

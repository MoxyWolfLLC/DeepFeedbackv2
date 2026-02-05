'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Loader2, RefreshCw, CheckCircle2, AlertCircle, TrendingUp, Lightbulb, Target, Download, FileText, Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/client'

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const [isRunning, setIsRunning] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { data: rubric, isLoading: rubricLoading } = trpc.rubric.get.useQuery({ id })

  const { data: latestAnalysis, isLoading: analysisLoading, refetch } = trpc.analysis.getLatest.useQuery(
    { rubricId: id },
    { enabled: !!id }
  )

  const runAnalysis = trpc.analysis.run.useMutation({
    onMutate: () => setIsRunning(true),
    onSuccess: () => {
      setIsRunning(false)
      refetch()
    },
    onError: () => setIsRunning(false),
  })

  const handleRunAnalysis = () => {
    if (!rubric) return

    const completedInterviewIds = rubric.interviews
      .filter((i) => i.status === 'COMPLETED')
      .map((i) => i.id)

    runAnalysis.mutate({
      rubricId: id,
      interviewIds: completedInterviewIds,
      useCouncil: false,
    })
  }

  const handleExport = async (format: 'markdown' | 'slides-json' | 'slides-markdown') => {
    if (!latestAnalysis) return

    setIsExporting(true)
    try {
      const endpoint = format === 'markdown'
        ? '/api/export/analysis/markdown'
        : '/api/export/analysis/slides'

      const body = format === 'markdown'
        ? { analysisId: latestAnalysis.id }
        : { analysisId: latestAnalysis.id, format: format === 'slides-markdown' ? 'markdown-slides' : 'json' }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `analysis.${format === 'markdown' ? 'md' : format === 'slides-json' ? 'json' : 'md'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (rubricLoading || analysisLoading) {
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

  const completedInterviews = rubric.interviews.filter((i) => i.status === 'COMPLETED')
  const themes = (latestAnalysis?.themes as any[]) || []
  const insights = (latestAnalysis?.insights as any[]) || []
  const recommendations = (latestAnalysis?.recommendations as any[]) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href={`/rubrics/${id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Research Project
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Analysis Results
            </h1>
            <p className="text-muted-foreground mt-1">{rubric.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {latestAnalysis && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('markdown')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('slides-markdown')}>
                    <Presentation className="w-4 h-4 mr-2" />
                    Export Slides (Markdown)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('slides-json')}>
                    <Presentation className="w-4 h-4 mr-2" />
                    Export Slides (JSON)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              onClick={handleRunAnalysis}
              disabled={isRunning || completedInterviews.length < 5}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {latestAnalysis ? 'Re-run Analysis' : 'Run Analysis'}
                </>
              )}
            </Button>
          </div>
        </div>

        {isRunning && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Analysis in progress...</p>
                  <p className="text-sm text-muted-foreground">
                    Analyzing {completedInterviews.length} interview transcripts
                  </p>
                </div>
              </div>
              <Progress value={33} className="h-2" />
            </CardContent>
          </Card>
        )}

        {!latestAnalysis && !isRunning && (
          <Card className="mb-8">
            <CardContent className="pt-6 text-center py-12">
              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No analysis yet</h3>
              <p className="text-muted-foreground mb-4">
                {completedInterviews.length < 5
                  ? `You need at least 5 completed interviews to run analysis. Currently have ${completedInterviews.length}.`
                  : `You have ${completedInterviews.length} completed interviews ready for analysis.`}
              </p>
              {completedInterviews.length >= 5 && (
                <Button onClick={handleRunAnalysis}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Run Analysis
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {latestAnalysis && !isRunning && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{latestAnalysis.interviewCount}</div>
                  <p className="text-sm text-muted-foreground">Interviews Analyzed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{themes.length}</div>
                  <p className="text-sm text-muted-foreground">Themes Found</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{insights.length}</div>
                  <p className="text-sm text-muted-foreground">Key Insights</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{latestAnalysis.confidence || 0}%</div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Key Themes
                </CardTitle>
                <CardDescription>
                  Recurring patterns and topics across interviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                {themes.length === 0 ? (
                  <p className="text-muted-foreground">No themes identified</p>
                ) : (
                  <div className="space-y-6">
                    {themes.map((theme: any, idx: number) => (
                      <div key={theme.id || idx} className="border-l-4 border-primary pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{theme.name}</h4>
                          <span className="text-sm text-muted-foreground">
                            {theme.prevalence}% prevalence
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{theme.description}</p>
                        {theme.supportingQuotes && theme.supportingQuotes.length > 0 && (
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                              Supporting Quotes
                            </p>
                            {theme.supportingQuotes.slice(0, 2).map((q: any, i: number) => (
                              <blockquote key={i} className="text-sm italic border-l-2 border-gray-300 pl-3 mb-2">
                                "{q.quote || q}"
                              </blockquote>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Key Insights
                </CardTitle>
                <CardDescription>
                  Important findings from the interview data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.length === 0 ? (
                  <p className="text-muted-foreground">No insights identified</p>
                ) : (
                  <div className="space-y-4">
                    {insights.map((insight: any, idx: number) => (
                      <div key={insight.id || idx} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{insight.text}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Confidence: {insight.confidence}%</span>
                            <span>Based on {insight.supportingInterviewCount} interviews</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Recommendations
                </CardTitle>
                <CardDescription>
                  Suggested actions based on the analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <p className="text-muted-foreground">No recommendations identified</p>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec: any, idx: number) => (
                      <div
                        key={rec.id || idx}
                        className={`flex items-start gap-3 p-4 rounded-lg ${
                          rec.priority === 'high'
                            ? 'bg-red-50 border-l-4 border-red-500'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-50 border-l-4 border-yellow-500'
                            : 'bg-green-50 border-l-4 border-green-500'
                        }`}
                      >
                        <AlertCircle
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            rec.priority === 'high'
                              ? 'text-red-600'
                              : rec.priority === 'medium'
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${
                                rec.priority === 'high'
                                  ? 'bg-red-100 text-red-700'
                                  : rec.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {rec.priority} priority
                            </span>
                          </div>
                          <p className="font-medium">{rec.text}</p>
                          {rec.impact && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Impact: {rec.impact}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Analysis completed on{' '}
              {latestAnalysis.completedAt
                ? new Date(latestAnalysis.completedAt).toLocaleString()
                : 'Unknown'}
              {latestAnalysis.processingTime && (
                <span> | Processing time: {(latestAnalysis.processingTime / 1000).toFixed(1)}s</span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Plus, FileText, Users, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc/client'

export default function DashboardPage() {
  const { data: rubrics, isLoading } = trpc.rubric.list.useQuery()

  const stats = {
    totalRubrics: rubrics?.length ?? 0,
    totalInterviews: rubrics?.reduce((acc, r) => acc + r._count.interviews, 0) ?? 0,
    completedInterviews:
      rubrics?.reduce((acc, r) => acc + r._count.interviews, 0) ?? 0, // TODO: filter by status
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Resonance</h1>
          <Link href="/rubrics/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Research
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Research Projects
              </CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRubrics}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Interviews
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInterviews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedInterviews}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Rubrics */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Research Projects</h2>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : rubrics?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No research projects yet. Create your first one!
                </p>
                <Link href="/rubrics/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Research Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rubrics?.map((rubric) => (
                <Link key={rubric.id} href={`/rubrics/${rubric.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{rubric.title}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {rubric.researchGoals}
                          </CardDescription>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            rubric.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : rubric.status === 'DRAFT'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rubric.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{rubric._count.interviews} interviews</span>
                        <span>
                          {rubric.questions
                            ? (rubric.questions as any[]).length
                            : 0}{' '}
                          questions
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

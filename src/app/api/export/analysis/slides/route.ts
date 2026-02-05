import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import pptxgen from 'pptxgenjs'

export async function POST(request: NextRequest) {
  try {
    const { analysisId } = await request.json()

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 })
    }

    const analysis = await prisma.analysisJob.findUnique({
      where: { id: analysisId },
      include: { rubric: { select: { title: true, researchGoals: true } } },
    })

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const themes = (analysis.themes as any[]) || []
    const insights = (analysis.insights as any[]) || []
    const recommendations = (analysis.recommendations as any[]) || []

    const pres = new pptxgen()
    pres.title = analysis.rubric.title
    pres.author = 'Resonance'
    pres.subject = 'Research Analysis Report'

    const titleSlide = pres.addSlide()
    titleSlide.addText(analysis.rubric.title, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: '1a1a2e',
      align: 'center',
    })
    titleSlide.addText('Research Analysis Report', {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 0.5,
      fontSize: 18,
      color: '666666',
      align: 'center',
    })
    titleSlide.addText(
      `${analysis.interviewCount} Interviews | ${analysis.completedAt?.toLocaleDateString() || 'N/A'}`,
      {
        x: 0.5,
        y: 5,
        w: 9,
        h: 0.3,
        fontSize: 12,
        color: '999999',
        align: 'center',
      }
    )

    const summarySlide = pres.addSlide()
    summarySlide.addText('Executive Summary', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: '1a1a2e',
    })
    const summaryBullets = [
      `${analysis.interviewCount} interviews analyzed`,
      `${themes.length} themes identified`,
      `${insights.length} insights discovered`,
      `${recommendations.length} recommendations`,
      `${analysis.confidence || 0}% confidence`,
    ]
    summarySlide.addText(
      summaryBullets.map((text) => ({ text, options: { bullet: true, fontSize: 18, color: '333333' } })),
      { x: 0.5, y: 1.5, w: 9, h: 3.5 }
    )

    const goalsSlide = pres.addSlide()
    goalsSlide.addText('Research Goals', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: '1a1a2e',
    })
    goalsSlide.addText(analysis.rubric.researchGoals, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 3.5,
      fontSize: 16,
      color: '333333',
      valign: 'top',
    })

    if (themes.length > 0) {
      const themesOverview = pres.addSlide()
      themesOverview.addText('Key Themes', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: '1a1a2e',
      })
      const themeBullets = themes.slice(0, 6).map((t) => ({
        text: `${t.name} (${t.prevalence}% prevalence)`,
        options: { bullet: true, fontSize: 16, color: '333333' },
      }))
      themesOverview.addText(themeBullets, { x: 0.5, y: 1.5, w: 9, h: 3.5 })

      themes.slice(0, 5).forEach((theme, idx) => {
        const themeSlide = pres.addSlide()
        themeSlide.addText(`Theme ${idx + 1}: ${theme.name}`, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 0.8,
          fontSize: 24,
          bold: true,
          color: '1a1a2e',
        })
        themeSlide.addText(`${theme.prevalence}% prevalence`, {
          x: 0.5,
          y: 1.2,
          w: 9,
          h: 0.4,
          fontSize: 14,
          italic: true,
          color: '666666',
        })
        themeSlide.addText(theme.description || '', {
          x: 0.5,
          y: 1.8,
          w: 9,
          h: 2,
          fontSize: 14,
          color: '333333',
          valign: 'top',
        })
        if (theme.supportingQuotes?.[0]?.quote) {
          themeSlide.addShape('rect' as pptxgen.ShapeType, {
            x: 0.5,
            y: 4,
            w: 9,
            h: 1,
            fill: { color: 'f5f5f5' },
          })
          themeSlide.addText(`"${theme.supportingQuotes[0].quote}"`, {
            x: 0.7,
            y: 4.1,
            w: 8.6,
            h: 0.8,
            fontSize: 12,
            italic: true,
            color: '555555',
            valign: 'middle',
          })
        }
      })
    }

    if (insights.length > 0) {
      const insightsSlide = pres.addSlide()
      insightsSlide.addText('Key Insights', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: '1a1a2e',
      })
      const insightBullets = insights.slice(0, 5).map((i) => ({
        text: i.text,
        options: { bullet: true, fontSize: 14, color: '333333' },
      }))
      insightsSlide.addText(insightBullets, { x: 0.5, y: 1.5, w: 9, h: 3.5 })
    }

    if (recommendations.length > 0) {
      const recsSlide = pres.addSlide()
      recsSlide.addText('Recommendations', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: '1a1a2e',
      })

      recommendations.slice(0, 5).forEach((rec, idx) => {
        const priorityColor =
          rec.priority === 'high' ? 'dc2626' : rec.priority === 'medium' ? 'f59e0b' : '22c55e'

        recsSlide.addShape('rect' as pptxgen.ShapeType, {
          x: 0.5,
          y: 1.4 + idx * 0.9,
          w: 0.15,
          h: 0.7,
          fill: { color: priorityColor },
        })
        recsSlide.addText(rec.text, {
          x: 0.8,
          y: 1.4 + idx * 0.9,
          w: 8.7,
          h: 0.7,
          fontSize: 12,
          color: '333333',
          valign: 'middle',
        })
      })
    }

    const closingSlide = pres.addSlide()
    closingSlide.addText('Thank You', {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1,
      fontSize: 36,
      bold: true,
      color: '1a1a2e',
      align: 'center',
    })
    closingSlide.addText('Generated by Resonance', {
      x: 0.5,
      y: 5,
      w: 9,
      h: 0.3,
      fontSize: 12,
      color: '999999',
      align: 'center',
    })

    const pptxBuffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer

    const filename = `${analysis.rubric.title.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}-analysis.pptx`

    return new NextResponse(new Uint8Array(pptxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 })
  }
}

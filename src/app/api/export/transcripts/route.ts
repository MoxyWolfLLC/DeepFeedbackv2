import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const { interviewIds } = await request.json()

    if (!interviewIds || !Array.isArray(interviewIds) || interviewIds.length === 0) {
      return NextResponse.json(
        { error: 'No interviews selected' },
        { status: 400 }
      )
    }

    const interviews = await prisma.interview.findMany({
      where: {
        id: { in: interviewIds },
      },
      include: {
        rubric: {
          select: {
            title: true,
            researchGoals: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (interviews.length === 0) {
      return NextResponse.json(
        { error: 'No interviews found' },
        { status: 404 }
      )
    }

    const workbook = XLSX.utils.book_new()

    const summaryData = interviews.map((interview, idx) => ({
      '#': idx + 1,
      'Participant Name': interview.participantName || 'Anonymous',
      'Participant Email': interview.participantEmail || 'N/A',
      'Status': interview.status,
      'Started': interview.startedAt?.toISOString() || 'N/A',
      'Completed': interview.completedAt?.toISOString() || 'N/A',
      'Message Count': interview.messages.length,
      'Research Project': interview.rubric.title,
    }))

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    interviews.forEach((interview, idx) => {
      const participantName = interview.participantName || `Interview ${idx + 1}`
      const sheetName = participantName.substring(0, 28)

      const transcriptData = interview.messages.map((msg, msgIdx) => ({
        '#': msgIdx + 1,
        'Role': msg.role === 'ASSISTANT' ? 'Interviewer' : 'Participant',
        'Message': msg.content,
        'Timestamp': msg.createdAt.toISOString(),
      }))

      const transcriptSheet = XLSX.utils.json_to_sheet(transcriptData)
      transcriptSheet['!cols'] = [
        { wch: 5 },
        { wch: 12 },
        { wch: 100 },
        { wch: 25 },
      ]

      XLSX.utils.book_append_sheet(workbook, transcriptSheet, sheetName)
    })

    const fullTranscriptData: any[] = []
    interviews.forEach((interview) => {
      const participantName = interview.participantName || 'Anonymous'

      fullTranscriptData.push({
        'Participant': `--- ${participantName} ---`,
        'Role': '',
        'Message': `Status: ${interview.status} | Messages: ${interview.messages.length}`,
        'Timestamp': '',
      })

      interview.messages.forEach((msg) => {
        fullTranscriptData.push({
          'Participant': participantName,
          'Role': msg.role === 'ASSISTANT' ? 'Interviewer' : 'Participant',
          'Message': msg.content,
          'Timestamp': msg.createdAt.toISOString(),
        })
      })

      fullTranscriptData.push({
        'Participant': '',
        'Role': '',
        'Message': '',
        'Timestamp': '',
      })
    })

    const fullSheet = XLSX.utils.json_to_sheet(fullTranscriptData)
    fullSheet['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 100 },
      { wch: 25 },
    ]
    XLSX.utils.book_append_sheet(workbook, fullSheet, 'All Transcripts')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const filename = `transcripts-${interviews[0].rubric.title.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}-${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export transcripts' },
      { status: 500 }
    )
  }
}

'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Mail, Link2, Code, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc/client'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rubricId: string
  rubricTitle: string
}

interface GeneratedLink {
  email: string
  link: string
  copied: boolean
}

export function ShareModal({ open, onOpenChange, rubricId, rubricTitle }: ShareModalProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([])
  const [emailSubject, setEmailSubject] = useState(`You're invited to participate in: ${rubricTitle}`)
  const [emailBody, setEmailBody] = useState(
    `Hi there,\n\nYou've been invited to participate in a research interview about "${rubricTitle}".\n\nThis is a conversational interview that typically takes 10-15 minutes. Your responses are valuable and will help us understand your experiences better.\n\nClick the link below to begin:\n{{INTERVIEW_LINK}}\n\nThank you for your time!`
  )

  const createLink = trpc.interview.createLink.useMutation()

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const genericInterviewLink = `${baseUrl}/interview/start?rubric=${rubricId}`
  
  const embedCode = `<iframe 
  src="${genericInterviewLink}" 
  width="100%" 
  height="600" 
  frameborder="0" 
  allow="microphone"
  style="border: 1px solid #e5e7eb; border-radius: 8px;">
</iframe>`

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const addEmail = () => {
    const email = emailInput.trim()
    if (email && email.includes('@') && !emails.includes(email)) {
      setEmails([...emails, email])
      setEmailInput('')
    }
  }

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail()
    }
  }

  const generateInviteLinks = async () => {
    const newLinks: GeneratedLink[] = []
    for (const email of emails) {
      const result = await createLink.mutateAsync({ rubricId, email })
      newLinks.push({
        email,
        link: `${baseUrl}/interview/${result.token}`,
        copied: false,
      })
    }
    setGeneratedLinks(newLinks)
    setEmails([])
  }

  const copyLinkForEmail = (email: string, link: string) => {
    navigator.clipboard.writeText(link)
    setGeneratedLinks(prev => 
      prev.map(l => l.email === email ? { ...l, copied: true } : l)
    )
    setTimeout(() => {
      setGeneratedLinks(prev => 
        prev.map(l => l.email === email ? { ...l, copied: false } : l)
      )
    }, 2000)
  }

  const openMailClient = (email: string, link: string) => {
    const subject = encodeURIComponent(emailSubject)
    const body = encodeURIComponent(emailBody.replace('{{INTERVIEW_LINK}}', link))
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank')
  }

  useEffect(() => {
    if (!open) {
      setGeneratedLinks([])
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Interview</DialogTitle>
          <DialogDescription>
            Invite participants to your research interview
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">
              <Link2 className="w-4 h-4 mr-2" />
              Link
            </TabsTrigger>
            <TabsTrigger value="embed">
              <Code className="w-4 h-4 mr-2" />
              Embed
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div>
              <Label>Public Interview Link</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Share this link publicly. Each person who opens the link will start their own interview session.
              </p>
              <div className="flex gap-2">
                <Input value={genericInterviewLink} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(genericInterviewLink, 'link')}
                >
                  {copied === 'link' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="embed" className="space-y-4 mt-4">
            <div>
              <Label>Embed Code</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Copy this code to embed the interview on your website.
              </p>
              <div className="relative">
                <Textarea
                  value={embedCode}
                  readOnly
                  rows={8}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(embedCode, 'embed')}
                >
                  {copied === 'embed' ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            {generatedLinks.length === 0 ? (
              <>
                <div>
                  <Label>Add Participants</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter email addresses to generate unique invite links for each participant.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <Button variant="outline" size="icon" onClick={addEmail}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {emails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {emails.map((email) => (
                        <div
                          key={email}
                          className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm"
                        >
                          {email}
                          <button
                            onClick={() => removeEmail(email)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Email Subject</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Email Message</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Use {'{{INTERVIEW_LINK}}'} to insert the unique interview link.
                  </p>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button
                  onClick={generateInviteLinks}
                  disabled={emails.length === 0 || createLink.isPending}
                  className="w-full"
                >
                  {createLink.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating links...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Generate {emails.length} Invite Link{emails.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label>Generated Invite Links</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Each participant has a unique link. Copy the link or click the email icon to open your email client with the pre-filled message.
                  </p>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {generatedLinks.map(({ email, link, copied }) => (
                      <div key={email} className="border rounded-lg p-3">
                        <p className="font-medium text-sm mb-1">{email}</p>
                        <div className="flex gap-2">
                          <Input value={link} readOnly className="font-mono text-xs" />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyLinkForEmail(email, link)}
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openMailClient(email, link)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setGeneratedLinks([])}
                  className="w-full"
                >
                  Generate More Links
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

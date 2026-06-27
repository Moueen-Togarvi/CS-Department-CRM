'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sparkles, Loader2, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'

export type AiEntityType = 'student' | 'faculty' | 'course'

interface AiInputProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: AiEntityType
  onParsed: (data: Record<string, any>, confidence: number) => void
}

const ENTITY_LABELS: Record<AiEntityType, string> = {
  student: 'Student',
  faculty: 'Faculty',
  course: 'Course',
}

const ENTITY_HINTS: Record<AiEntityType, string> = {
  student:
    'e.g., "Create student Muhammad Ali, batch 2025, CS department, semester 1, father name Ahmad Khan, phone 0300-1234567"',
  faculty:
    'e.g., "Add Dr. Sara Ahmed as Assistant Professor specializing in Data Science, PhD, office Room 202"',
  course:
    'e.g., "Create course CS301 Data Structures, 3 credits, 1 lab credit, offered in semester 3"',
}

export function AiInput({ open, onOpenChange, entityType, onParsed }: AiInputProps) {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [result, setResult] = useState<{ data: Record<string, any>; confidence: number } | null>(null)

  // Check AI availability on mount
  useEffect(() => {
    if (open) {
      fetch('/api/ai/status')
        .then((r) => r.json())
        .then((d) => setAiAvailable(d.available ?? false))
        .catch(() => setAiAvailable(false))
    }
  }, [open])

  const reset = useCallback(() => {
    setText('')
    setResult(null)
  }, [])

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) reset()
      onOpenChange(open)
    },
    [reset, onOpenChange]
  )

  const handleParse = useCallback(async () => {
    if (!text.trim()) return
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/ai/smart-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, entityType }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        setResult({ data: data.data, confidence: data.confidence ?? 0 })
      } else {
        toast.error(data.error || 'Failed to parse data with AI')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [text, entityType])

  const handleApply = useCallback(() => {
    if (!result) return
    onParsed(result.data, result.confidence)
    handleClose(false)
    toast.success('Form fields populated from AI parsing')
  }, [result, onParsed, handleClose])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            AI Smart Entry — {ENTITY_LABELS[entityType]}
          </DialogTitle>
          <DialogDescription>
            Paste natural language describing the {entityType.toLowerCase()} and AI will extract the
            fields for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI availability badge */}
          {aiAvailable === false && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                AI service is currently unavailable. Please enter data manually.
              </p>
            </div>
          )}

          {/* Textarea */}
          <div className="space-y-2">
            <Textarea
              placeholder={ENTITY_HINTS[entityType]}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] text-sm"
              disabled={isLoading || aiAvailable === false}
            />
            <p className="text-xs text-muted-foreground">
              Describe the {entityType.toLowerCase()} in natural language. AI will extract the
              relevant fields.
            </p>
          </div>

          {/* Preview result */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Extracted Fields</p>
                <Badge
                  variant={result.confidence >= 0.8 ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {Math.round(result.confidence * 100)}% confidence
                </Badge>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                {Object.entries(result.data).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-muted-foreground min-w-[120px]">
                      {key}
                    </span>
                    <span>{String(value || '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          {result ? (
            <Button onClick={handleApply} disabled={isLoading}>
              Apply to Form
            </Button>
          ) : (
            <Button
              onClick={handleParse}
              disabled={!text.trim() || isLoading || aiAvailable === false}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              Parse with AI
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
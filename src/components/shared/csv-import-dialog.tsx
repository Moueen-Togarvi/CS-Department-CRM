'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type ImportEntityType = 'students' | 'faculty' | 'courses'

interface ImportError {
  row: number
  message: string
}

interface ImportResult {
  success: boolean
  imported: number
  errors: ImportError[]
}

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: ImportEntityType
  onImportComplete?: () => void
}

const ENTITY_LABELS: Record<ImportEntityType, string> = {
  students: 'Students',
  faculty: 'Faculty',
  courses: 'Courses',
}

export function CsvImportDialog({
  open,
  onOpenChange,
  entityType,
  onImportComplete,
}: CsvImportDialogProps) {
  const [csvText, setCsvText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [activeTab, setActiveTab] = useState('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setCsvText('')
    setResult(null)
    setIsDragging(false)
    setActiveTab('upload')
  }, [])

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) reset()
      onOpenChange(open)
    },
    [reset, onOpenChange]
  )

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a CSV file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvText(text)
      setResult(null)
      toast.success(`File "${file.name}" loaded (${text.split('\n').length - 1} rows)`)
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const downloadTemplate = useCallback(() => {
    window.open(`/api/import/template/${entityType}`, '_blank')
  }, [entityType])

  const handleImport = useCallback(async () => {
    if (!csvText.trim()) {
      toast.error('Please provide CSV data')
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      const response = await fetch(`/api/import/${entityType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      })

      const data: ImportResult = await response.json()

      if (data.success) {
        setResult(data)
        setActiveTab('results')
        if (data.errors.length === 0) {
          toast.success(`${data.imported} ${entityType} imported successfully!`)
        } else {
          toast.warning(`${data.imported} imported, ${data.errors.length} errors`)
        }
        onImportComplete?.()
      } else {
        toast.error('Import failed. Please check your CSV format.')
      }
    } catch {
      toast.error('Network error during import')
    } finally {
      setIsImporting(false)
    }
  }, [csvText, entityType, onImportComplete])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            Import {ENTITY_LABELS[entityType]}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV data to bulk import {entityType}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="upload" disabled={isImporting}>
                <FileText className="size-3.5 mr-1.5" />
                CSV Data
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!result}>
                <CheckCircle2 className="size-3.5 mr-1.5" />
                Results
                {result && result.errors.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">
                    {result.errors.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload" className="flex-1 flex flex-col gap-4 mt-4 min-h-0">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Upload
                className={cn(
                  'size-8 transition-colors',
                  isDragging ? 'text-primary' : 'text-muted-foreground/50'
                )}
              />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isDragging ? 'Drop your CSV file here' : 'Click to upload or drag & drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
            </div>

            {/* Divider with OR */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">OR PASTE CSV BELOW</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Textarea */}
            <Textarea
              placeholder="Paste CSV data here..."
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value)
                setResult(null)
              }}
              className="flex-1 min-h-[160px] font-mono text-xs resize-none"
              disabled={isImporting}
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Need a template?</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary"
                onClick={downloadTemplate}
              >
                <Download className="size-3 mr-1" />
                Download CSV Template
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="flex-1 flex flex-col gap-4 mt-4 min-h-0">
            {result && (
              <>
                {/* Summary */}
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg border p-3 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {result.imported} Records Imported
                      </p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                        Successfully added to the system
                      </p>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="flex-1 rounded-lg border p-3 flex items-center gap-3 bg-destructive/5 border-destructive/20">
                      <AlertCircle className="size-5 text-destructive shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-destructive">
                          {result.errors.length} Errors
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Some rows had validation errors
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error list */}
                {result.errors.length > 0 && (
                  <div className="flex-1 min-h-0">
                    <p className="text-sm font-medium mb-2">Error Details</p>
                    <ScrollArea className="h-[200px] rounded-lg border">
                      <div className="p-3 space-y-2">
                        {result.errors.map((err, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs"
                          >
                            <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0 mt-0.5">
                              Row {err.row}
                            </Badge>
                            <span className="text-muted-foreground">{err.message}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2 border-t mt-auto">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isImporting}>
            Cancel
          </Button>
          {result && (
            <Button
              variant="outline"
              onClick={reset}
              disabled={isImporting}
            >
              Import More
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={!csvText.trim() || isImporting}
          >
            {isImporting && <Loader2 className="size-4 animate-spin mr-2" />}
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
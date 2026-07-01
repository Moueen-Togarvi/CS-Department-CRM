'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Save,
  Lock,
  FileText,
  Download,
  Search,
  Trophy,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Printer,
  GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { PageHeader } from '@/components/shared/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ============ TYPES ============

interface EnrollmentEntry {
  index: number
  enrollmentId: string
  studentId: string
  studentName: string
  studentCode: string
  section: string
  result: {
    id: string
    assignmentMarks: number | null
    quizMarks: number | null
    midtermMarks: number | null
    finalMarks: number | null
    labMarks: number | null
    projectMarks: number | null
    totalMarks: number | null
    percentage: number | null
    grade: string | null
    gradePoint: number | null
    isLocked: boolean
  } | null
}

// ============ HELPERS ============

function formatGrade(grade: string | null | undefined): string {
  if (!grade) return '-'
  const map: Record<string, string> = {
    A: 'A', A_MINUS: 'A-', B_PLUS: 'B+', B: 'B', B_MINUS: 'B-',
    C_PLUS: 'C+', C: 'C', C_MINUS: 'C-', D_PLUS: 'D+', D: 'D',
    F: 'F', I: 'I', W: 'W',
  }
  return map[grade] || grade
}

function getGradeColor(grade: string | null | undefined): string {
  if (!grade) return 'bg-muted text-muted-foreground'
  const colorMap: Record<string, string> = {
    A: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    A_MINUS: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15',
    B_PLUS: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20',
    B: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/15',
    B_MINUS: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    C_PLUS: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
    C: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15',
    C_MINUS: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20',
    D_PLUS: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/15',
    D: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20',
    F: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
    I: 'bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20',
    W: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/15',
  }
  return colorMap[grade] || 'bg-muted text-muted-foreground'
}

const MARKS_FIELDS = ['assignmentMarks', 'quizMarks', 'midtermMarks', 'finalMarks', 'labMarks', 'projectMarks'] as const

function calcRowTotal(marks: Record<string, string | number | null | undefined>): number {
  let total = 0
  for (const f of MARKS_FIELDS) {
    const v = parseFloat(String(marks[f]))
    if (!isNaN(v)) total += v
  }
  return Math.round(total * 100) / 100
}

function calcPercentage(total: number): number {
  return Math.round((total / 100) * 10000) / 100
}

function calcGradeFromPercentage(pct: number): { grade: string; gradePoint: number } {
  const scale = [
    { min: 90, max: 100, grade: 'A', gp: 4.0 },
    { min: 85, max: 89, grade: 'A-', gp: 3.7 },
    { min: 80, max: 84, grade: 'B+', gp: 3.3 },
    { min: 75, max: 79, grade: 'B', gp: 3.0 },
    { min: 70, max: 74, grade: 'B-', gp: 2.7 },
    { min: 65, max: 69, grade: 'C+', gp: 2.3 },
    { min: 60, max: 64, grade: 'C', gp: 2.0 },
    { min: 55, max: 59, grade: 'C-', gp: 1.7 },
    { min: 50, max: 54, grade: 'D+', gp: 1.3 },
    { min: 45, max: 49, grade: 'D', gp: 1.0 },
    { min: 0, max: 44, grade: 'F', gp: 0.0 },
  ]
  const entry = scale.find(s => pct >= s.min && pct <= s.max)
  return entry ? { grade: entry.grade, gradePoint: entry.gp } : { grade: 'F', gradePoint: 0.0 }
}

// ============ MAIN COMPONENT ============

export function ResultModule() {
  const user = useAuthStore((s) => s.user)
  const isStudent = user?.role === 'STUDENT'
  const defaultTab = isStudent ? 'transcript' : 'course-results'

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Results"
        description={isStudent ? 'View your results and transcript' : 'Enter, manage, and publish examination results'}
      />

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          {!isStudent && (
            <TabsTrigger value="course-results" className="flex-1 sm:flex-initial">
              <FileText className="size-4 mr-1.5 hidden sm:inline-block" />
              Course Results
            </TabsTrigger>
          )}
          <TabsTrigger value="transcript" className="flex-1 sm:flex-initial">
            <GraduationCap className="size-4 mr-1.5 hidden sm:inline-block" />
            Student Transcript
          </TabsTrigger>
          {!isStudent && (
            <TabsTrigger value="reports" className="flex-1 sm:flex-initial">
              <BarChart3 className="size-4 mr-1.5 hidden sm:inline-block" />
              Reports
            </TabsTrigger>
          )}
        </TabsList>

        {!isStudent && (
          <TabsContent value="course-results">
            <CourseResultsTab />
          </TabsContent>
        )}

        <TabsContent value="transcript">
          <StudentTranscriptTab />
        </TabsContent>

        {!isStudent && (
          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ============ COURSE RESULTS TAB ============

function CourseResultsTab() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isFaculty = user?.role === 'FACULTY'
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedSemester, setSelectedSemester] = useState<string>('')
  const [selectedAcademicSemester, setSelectedAcademicSemester] = useState<string>('1')
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  // Tracks only user modifications to marks fields
  const [dirtyEdits, setDirtyEdits] = useState<Record<string, Record<string, string | number>>>({})

  // Default selected semester to current semester
  const { data: semesters } = useQuery({
    queryKey: ['results-semesters'],
    queryFn: async () => {
      const res = await fetch('/api/semesters')
      const json = await res.json()
      return (json.data || []) as Array<{ id: string; name: string; isCurrent: boolean }>
    },
  })

  const currentSemesterId = useMemo(() => {
    return semesters?.find((s) => s.isCurrent)?.id || semesters?.[0]?.id || ''
  }, [semesters])

  // Faculty: only assigned courses
  const { data: facultyOfferings } = useQuery({
    queryKey: ['faculty-offerings', currentSemesterId],
    queryFn: async () => {
      const res = await fetch(`/api/faculty/me/offerings?semesterId=${currentSemesterId}`)
      const json = await res.json()
      return (json.data?.offerings || []) as Array<{ course: { id: string; code: string; name: string; semesterOffered?: number | null } }>
    },
    enabled: isFaculty && !!currentSemesterId,
  })

  // Admin: all courses
  const { data: allCourses } = useQuery({
    queryKey: ['results-courses'],
    queryFn: async () => {
      const res = await fetch('/api/courses?limit=100')
      const json = await res.json()
      return (json.data || []) as Array<{ id: string; code: string; name: string; semesterOffered?: number | null }>
    },
    enabled: !isFaculty,
  })

  const courses = useMemo(() => {
    if (isFaculty) {
      return (facultyOfferings || []).map((o) => o.course)
    }
    return allCourses || []
  }, [isFaculty, facultyOfferings, allCourses])

  // Default selected semester to current semester
  useEffect(() => {
    if (currentSemesterId && !selectedSemester) {
      setSelectedSemester(currentSemesterId)
    }
  }, [currentSemesterId, selectedSemester])

  // Filter courses by selected academic semester
  const filteredCourses = useMemo(() => {
    if (!courses) return []
    if (isFaculty) return courses
    const targetSem = parseInt(selectedAcademicSemester, 10)
    return courses.filter((c) => c.semesterOffered === targetSem)
  }, [courses, selectedAcademicSemester, isFaculty])

  // Reset course selection if it is no longer in the filtered list
  useEffect(() => {
    if (selectedCourse) {
      const exists = filteredCourses.some((c) => c.id === selectedCourse)
      if (!exists) {
        setSelectedCourse('')
      }
    }
  }, [filteredCourses, selectedCourse])

  // Fetch entry data
  const { data: entryData, isLoading: entryLoading } = useQuery({
    queryKey: ['results-entry', selectedCourse, selectedSemester],
    queryFn: async () => {
      const params = new URLSearchParams({ courseId: selectedCourse, semesterId: selectedSemester })
      const res = await fetch(`/api/results/entry?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as { enrollments: EnrollmentEntry[]; isPublished: boolean }
    },
    enabled: !!selectedCourse && !!selectedSemester,
  })

  const isLocked = entryData?.isPublished ?? false

  // Get display value for a field: dirty edit takes precedence, then entryData result
  const getFieldDisplay = useCallback((enrollmentId: string, field: string): string | number => {
    const dirty = dirtyEdits[enrollmentId]?.[field]
    if (dirty !== undefined) return dirty
    const enrollment = entryData?.enrollments.find(e => e.enrollmentId === enrollmentId)
    return (enrollment?.result?.[field as keyof typeof enrollment.result] as number | null) ?? ''
  }, [dirtyEdits, entryData])

  // Get all marks for a row (for calculations)
  const getRowMarks = useCallback((enrollmentId: string): Record<string, string | number | null | undefined> => {
    const enrollment = entryData?.enrollments.find(e => e.enrollmentId === enrollmentId)
    const result = enrollment?.result
    const dirty = dirtyEdits[enrollmentId] || {}
    const marks: Record<string, string | number | null | undefined> = {}
    for (const f of MARKS_FIELDS) {
      marks[f] = dirty[f] !== undefined ? dirty[f] : (result?.[f as keyof typeof result] as number | null) ?? ''
    }
    return marks
  }, [dirtyEdits, entryData])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Build results array: for each enrollment, merge result data with dirty edits
      const results: Array<Record<string, number | null | string>> = []

      for (const enrollment of entryData?.enrollments || []) {
        const eid = enrollment.enrollmentId
        const hasDirty = dirtyEdits[eid] && Object.values(dirtyEdits[eid]).some(v => v !== '' && v !== undefined && v !== null)
        const hasExisting = enrollment.result

        // Only include if there are dirty edits or existing results to update
        if (!hasDirty && !hasExisting) continue

        const cleaned: Record<string, number | null | string> = { enrollmentId: eid }
        for (const f of MARKS_FIELDS) {
          const val = dirtyEdits[eid]?.[f]
          cleaned[f] = val !== '' && val !== undefined && val !== null ? Number(val) : (enrollment.result?.[f as keyof typeof enrollment.result] as number | null) ?? null
        }
        results.push(cleaned)
      }

      if (results.length === 0) return { processed: 0 }

      const res = await fetch('/api/results/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: (data) => {
      toast.success(`Saved ${data.processed} results successfully`)
      if (data.errors?.length) {
        toast.warning(`${data.errors.length} entries had issues`)
      }
      setDirtyEdits({})
      queryClient.invalidateQueries({ queryKey: ['results-entry'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save results')
    },
  })

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/results/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse, semesterId: selectedSemester }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: (data) => {
      toast.success(`${data.message || `Results published: ${data.total} students`}`)
      setPublishDialogOpen(false)
      setDirtyEdits({})
      queryClient.invalidateQueries({ queryKey: ['results-entry'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to publish results')
    },
  })

  const handleMarksChange = useCallback((enrollmentId: string, field: string, value: string) => {
    const numVal = value === '' ? '' : parseFloat(value)
    if (value !== '' && isNaN(Number(numVal))) return
    setDirtyEdits(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: numVal,
      },
    }))
  }, [])

  // Compute row calculations
  const rowCalcs = useMemo(() => {
    const calcs: Record<string, { total: number; percentage: number; grade: string; gradePoint: number }> = {}
    if (!entryData) return calcs
    for (const e of entryData.enrollments) {
      const marks = getRowMarks(e.enrollmentId)
      const total = calcRowTotal(marks)
      const hasAnyMark = MARKS_FIELDS.some(f => {
        const v = marks[f]
        return v !== '' && v !== undefined && v !== null && Number(v) > 0
      })
      if (!hasAnyMark) {
        calcs[e.enrollmentId] = { total: 0, percentage: 0, grade: '-', gradePoint: 0 }
        continue
      }
      const percentage = calcPercentage(total)
      const { grade, gradePoint } = calcGradeFromPercentage(percentage)
      calcs[e.enrollmentId] = { total, percentage, grade, gradePoint }
    }
    return calcs
  }, [entryData, getRowMarks])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Session</label>
              <Select
                value={selectedSemester}
                onValueChange={(v) => {
                  setSelectedSemester(v)
                  setSelectedCourse('')
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {semesters?.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.isCurrent && '(Current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Semester</label>
              <Select value={selectedAcademicSemester} onValueChange={setSelectedAcademicSemester}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      Semester {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCourses.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                  {filteredCourses.length === 0 && (
                    <SelectItem value="__none__" disabled className="text-muted-foreground text-xs text-center py-2">
                      No courses found for Semester {selectedAcademicSemester}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {selectedCourse && selectedSemester && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Marks Entry
                  {isLocked && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      <CheckCircle2 className="size-3 mr-1" />
                      Results Published
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {entryData ? `${entryData.enrollments.length} students enrolled` : 'Loading...'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={isLocked || saveMutation.isPending || entryLoading}
                >
                  <Save className="size-4 mr-1.5" />
                  {saveMutation.isPending ? 'Saving...' : 'Save All'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setPublishDialogOpen(true)}
                  disabled={isLocked || publishMutation.isPending}
                >
                  <Lock className="size-4 mr-1.5" />
                  {publishMutation.isPending ? 'Publishing...' : 'Publish Results'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {entryLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !entryData?.enrollments.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="size-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No students enrolled for this course and semester</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-background z-10">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="min-w-[180px]">Student Name</TableHead>
                      <TableHead className="min-w-[100px] text-center">Student ID</TableHead>
                      <TableHead className="min-w-[70px] text-center">Assign</TableHead>
                      <TableHead className="min-w-[60px] text-center">Quiz</TableHead>
                      <TableHead className="min-w-[70px] text-center">Mid</TableHead>
                      <TableHead className="min-w-[60px] text-center">Final</TableHead>
                      <TableHead className="min-w-[60px] text-center">Lab</TableHead>
                      <TableHead className="min-w-[60px] text-center">Proj</TableHead>
                      <TableHead className="min-w-[60px] text-center font-semibold">Total</TableHead>
                      <TableHead className="min-w-[60px] text-center font-semibold">%</TableHead>
                      <TableHead className="min-w-[60px] text-center">Grade</TableHead>
                      <TableHead className="min-w-[50px] text-center">GP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entryData.enrollments.map((enrollment) => {
                      const calc = rowCalcs[enrollment.enrollmentId] || { total: 0, percentage: 0, grade: '-', gradePoint: 0 }
                      const locked = isLocked || enrollment.result?.isLocked
                      const displayGrade = enrollment.result?.grade

                      return (
                        <TableRow key={enrollment.enrollmentId}>
                          <TableCell className="text-center text-muted-foreground text-xs">
                            {enrollment.index}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {enrollment.studentName}
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono text-muted-foreground">
                            {enrollment.studentCode}
                          </TableCell>
                          {MARKS_FIELDS.map((field) => (
                            <TableCell key={field} className="p-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={String(getFieldDisplay(enrollment.enrollmentId, field))}
                                onChange={(e) => handleMarksChange(enrollment.enrollmentId, field, e.target.value)}
                                disabled={locked}
                                className="h-8 w-full text-center text-xs font-mono border-transparent focus:border-primary bg-transparent focus:bg-background disabled:opacity-60"
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-mono font-semibold text-sm">
                            {calc.total || '-'}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm text-muted-foreground">
                            {calc.percentage ? `${calc.percentage}%` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {calc.grade !== '-' ? (
                              <Badge variant="outline" className={`text-xs ${getGradeColor(displayGrade || calc.grade)}`}>
                                {calc.grade}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm text-muted-foreground">
                            {calc.gradePoint || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Results?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock all results for the selected course and semester. Locked results cannot be modified.
              {entryData && ` This will affect ${entryData.enrollments.length} students.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => publishMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Publish Results
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ STUDENT TRANSCRIPT TAB ============

function StudentTranscriptTab() {
  const user = useAuthStore((s) => s.user)
  const isStudent = user?.role === 'STUDENT'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')

  // Students default to their own transcript
  useEffect(() => {
    if (isStudent && user?.studentId) {
      setSelectedStudentId(user.studentId)
    }
  }, [isStudent, user?.studentId])

  // Search students (faculty/admin only)
  const { data: studentResults } = useQuery({
    queryKey: ['transcript-search', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/students?${params}`)
      const json = await res.json()
      return (json.data || []) as Array<{ id: string; studentId: string; name: string; batch: string | null; program: string }>
    },
    enabled: !isStudent,
  })

  // Fetch transcript
  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ['transcript', selectedStudentId],
    queryFn: async () => {
      const res = await fetch(`/api/results/student/${selectedStudentId}/transcript`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!selectedStudentId,
  })

  return (
    <div className="space-y-4">
      {/* Student Search (faculty/admin only) */}
      {!isStudent && (
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {studentResults && studentResults.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {studentResults.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    selectedStudentId === s.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.studentId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{s.program}</p>
                    <p className="text-xs text-muted-foreground">{s.batch || '-'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Transcript Display */}
      {selectedStudentId && (
        <div id="transcript-print" className="space-y-4">
          {transcriptLoading ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ) : transcript ? (
            <>
              {/* Student Info Header */}
              <Card className="print:shadow-none print:border-0">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">{transcript.student.name}</h2>
                      <p className="text-sm font-mono text-muted-foreground mt-1">{transcript.student.studentId}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">{transcript.student.program}</Badge>
                        {transcript.student.batch && <Badge variant="outline">{transcript.student.batch}</Badge>}
                        {transcript.student.department && <Badge variant="secondary">{transcript.student.department}</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cumulative GPA</p>
                      <p className={`text-3xl font-bold tabular-nums ${
                        transcript.cumulativeGPA >= 3.0 ? 'text-emerald-600 dark:text-emerald-400' :
                        transcript.cumulativeGPA >= 2.0 ? 'text-amber-600 dark:text-amber-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {transcript.cumulativeGPA.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Semester-wise Transcript */}
              {transcript.semesters.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <GraduationCap className="size-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No academic records found</p>
                  </CardContent>
                </Card>
              ) : (
                transcript.semesters.map((sem: { semesterName: string; gpa: number; courses: Array<{ code: string; name: string; creditHours: number; labCreditHours: number; grade: string | null; gradePoint: number | null; totalMarks: number | null; percentage: number | null }> }, idx: number) => (
                  <Card key={idx} className="print:shadow-none print:border-0">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{sem.semesterName}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Semester GPA:</span>
                          <span className={`text-lg font-bold tabular-nums ${
                            sem.gpa >= 3.0 ? 'text-emerald-600 dark:text-emerald-400' :
                            sem.gpa >= 2.0 ? 'text-amber-600 dark:text-amber-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {sem.gpa.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead className="text-center">CrHrs</TableHead>
                              <TableHead className="text-center">Marks</TableHead>
                              <TableHead className="text-center">%</TableHead>
                              <TableHead className="text-center">Grade</TableHead>
                              <TableHead className="text-center">GP</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sem.courses.map((course, ci) => (
                              <TableRow key={ci}>
                                <TableCell className="font-mono text-sm font-medium">{course.code}</TableCell>
                                <TableCell className="text-sm">{course.name}</TableCell>
                                <TableCell className="text-center text-sm">
                                  {course.creditHours}{course.labCreditHours > 0 ? `+${course.labCreditHours}` : ''}
                                </TableCell>
                                <TableCell className="text-center font-mono text-sm">
                                  {course.totalMarks ?? '-'}
                                </TableCell>
                                <TableCell className="text-center font-mono text-sm text-muted-foreground">
                                  {course.percentage ? `${course.percentage}%` : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                  {course.grade ? (
                                    <Badge variant="outline" className={`text-xs ${getGradeColor(course.grade)}`}>
                                      {formatGrade(course.grade)}
                                    </Badge>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-center font-mono text-sm">
                                  {course.gradePoint ?? '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Print Button */}
              <div className="flex justify-end print:hidden">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                >
                  <Printer className="size-4 mr-2" />
                  Print Transcript
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ============ REPORTS TAB ============

const gradeChartConfig = {
  A: { label: 'A', color: '#10b981' },
  'A-': { label: 'A-', color: '#34d399' },
  'B+': { label: 'B+', color: '#0ea5e9' },
  B: { label: 'B', color: '#38bdf8' },
  'B-': { label: 'B-', color: '#06b6d4' },
  'C+': { label: 'C+', color: '#f59e0b' },
  C: { label: 'C', color: '#fbbf24' },
  'C-': { label: 'C-', color: '#f97316' },
  'D+': { label: 'D+', color: '#fb923c' },
  D: { label: 'D', color: '#ea580c' },
  F: { label: 'F', color: '#ef4444' },
  I: { label: 'I', color: '#6b7280' },
  W: { label: 'W', color: '#9ca3af' },
} as const

function ReportsTab() {
  const [selectedSemester, setSelectedSemester] = useState<string>('')

  // Fetch semesters
  const { data: semesters } = useQuery({
    queryKey: ['reports-semesters'],
    queryFn: async () => {
      const res = await fetch('/api/semesters')
      const json = await res.json()
      return (json.data || []) as Array<{ id: string; name: string; isCurrent: boolean }>
    },
  })

  // Default selected semester to current semester
  useEffect(() => {
    if (semesters && semesters.length > 0 && !selectedSemester) {
      const current = semesters.find((s) => s.isCurrent) || semesters[0]
      if (current) {
        setSelectedSemester(current.id)
      }
    }
  }, [semesters, selectedSemester])

  // Fetch reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['results-reports', selectedSemester],
    queryFn: async () => {
      const res = await fetch(`/api/results/reports?semesterId=${selectedSemester}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!selectedSemester,
  })

  // Transform grade distribution for chart
  const gradeChartData = useMemo(() => {
    if (!reports?.gradeDistribution) return []
    const dist = reports.gradeDistribution as Record<string, number>
    const order = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W']
    return order
      .filter(g => dist[g])
      .map(g => ({
        grade: g,
        count: dist[g],
        fill: gradeChartConfig[g as keyof typeof gradeChartConfig]?.color || '#6b7280',
      }))
  }, [reports])

  return (
    <div className="space-y-4">
      {/* Semester Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 space-y-1.5 w-full">
              <label className="text-xs font-medium text-muted-foreground">Semester</label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters?.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.isCurrent && '(Current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSemester && (
        <>
          {reportsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
              <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
          ) : reports ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="rounded-full bg-emerald-500/10 p-2">
                        <Users className="size-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{reports.summary.totalResults}</p>
                    <p className="text-xs text-muted-foreground">Total Results</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="rounded-full bg-sky-500/10 p-2">
                        <TrendingUp className="size-5 text-sky-600 dark:text-sky-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{reports.summary.averagePercentage}%</p>
                    <p className="text-xs text-muted-foreground">Average Marks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="rounded-full bg-amber-500/10 p-2">
                        <FileText className="size-5 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{reports.summary.averageGPA}</p>
                    <p className="text-xs text-muted-foreground">Average GPA</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="rounded-full bg-emerald-500/10 p-2">
                        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{reports.summary.passRate}%</p>
                    <p className="text-xs text-muted-foreground">Pass Rate</p>
                  </CardContent>
                </Card>
              </div>

              {/* Grade Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Grade Distribution</CardTitle>
                  <CardDescription>Distribution of grades across all courses</CardDescription>
                </CardHeader>
                <CardContent>
                  {gradeChartData.length > 0 ? (
                    <ChartContainer config={gradeChartConfig} className="h-64 w-full">
                      <BarChart data={gradeChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                      No grade data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Course-wise Stats Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Course-wise Statistics</CardTitle>
                  <CardDescription>Performance breakdown by course</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {reports.courseStats?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead className="text-center">Students</TableHead>
                            <TableHead className="text-center">Average</TableHead>
                            <TableHead className="text-center">Pass Rate</TableHead>
                            <TableHead className="text-center">Fail Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reports.courseStats.map((course: { courseCode: string; courseName: string; totalStudents: number; average: number; passRate: number; failCount: number }) => (
                            <TableRow key={course.courseCode}>
                              <TableCell>
                                <div>
                                  <p className="font-mono text-sm font-medium">{course.courseCode}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{course.courseName}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{course.totalStudents}</TableCell>
                              <TableCell className="text-center font-mono text-sm">{course.average}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={
                                  course.passRate >= 80 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' :
                                  course.passRate >= 60 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' :
                                  'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                                }>
                                  {course.passRate}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={course.failCount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                                  {course.failCount}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className="size-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">No course data available for this semester</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="size-5 text-amber-500" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>Students with highest average marks across all courses</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {reports.topPerformers?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">Rank</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead className="text-center">Courses</TableHead>
                            <TableHead className="text-center">Average Marks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reports.topPerformers.map((student: { studentId: string; name: string; averageMarks: number; totalCourses: number }, idx: number) => (
                            <TableRow key={student.studentId}>
                              <TableCell className="text-center">
                                {idx < 3 ? (
                                  <span className={`inline-flex items-center justify-center size-7 rounded-full text-xs font-bold ${
                                    idx === 0 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' :
                                    idx === 1 ? 'bg-gray-400/15 text-gray-600 dark:text-gray-400' :
                                    'bg-orange-500/15 text-orange-700 dark:text-orange-400'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">{idx + 1}</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">{student.totalCourses}</TableCell>
                              <TableCell className="text-center font-mono font-semibold">
                                <span className={student.averageMarks >= 80 ? 'text-emerald-600 dark:text-emerald-400' : student.averageMarks >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}>
                                  {student.averageMarks}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Trophy className="size-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">No performance data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
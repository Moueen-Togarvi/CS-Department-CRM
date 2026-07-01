'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardCheck,
  CalendarIcon,
  CheckCircle2,
  Clock,
  Download,
  UserCheck,
  BarChart3,
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/shared/page-header'

// ============== TYPES ==============
interface Semester {
  id: string
  name: string
  isCurrent: boolean
}

interface Course {
  id: string
  code: string
  name: string
  courseType: string
  semesterOffered?: number | null
}

interface EnrolledStudent {
  id: string
  student: {
    id: string
    studentId: string
    name: string
    email: string
  }
}

interface AttendanceSummaryItem {
  studentId: string
  student: { id: string; studentId: string; user: { name: string } }
  studentName: string
  present: number
  total: number
  percentage: number
}

type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'

const STATUS_OPTIONS: { value: AttendanceStatusType; label: string; color: string }[] = [
  { value: 'PRESENT', label: 'Present', color: 'text-emerald-600' },
  { value: 'ABSENT', label: 'Absent', color: 'text-red-600' },
  { value: 'LATE', label: 'Late', color: 'text-amber-600' },
  { value: 'EXCUSED', label: 'Excused', color: 'text-sky-600' },
]

const STATUS_BG: Record<string, string> = {
  PRESENT: 'bg-emerald-50 dark:bg-emerald-950/30',
  ABSENT: 'bg-red-50 dark:bg-red-950/30',
  LATE: 'bg-amber-50 dark:bg-amber-950/30',
  EXCUSED: 'bg-sky-50 dark:bg-sky-950/30',
}

// ============== MARK ATTENDANCE PANEL (key-based remount for clean state) ==============
function MarkAttendancePanel({
  courseId,
  semesterId,
  selectedDate,
  userId,
}: {
  courseId: string
  semesterId: string
  selectedDate: Date
  userId: string
}) {
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: enrollments, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['enrollments', courseId, semesterId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200' })
      const res = await fetch(`/api/courses/${courseId}/enrollments?${params}`)
      const json = await res.json()
      return (json.data?.enrollments || []) as EnrolledStudent[]
    },
    enabled: !!courseId,
  })

  const { data: existingAttendance, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['attendance-date', courseId, semesterId, dateStr],
    queryFn: async () => {
      const params = new URLSearchParams({
        courseId,
        semesterId,
        dateFrom: dateStr,
        dateTo: dateStr,
        limit: '200',
      })
      const res = await fetch('/api/attendance?' + params)
      const json = await res.json()
      return (json.data || []) as { studentId: string; status: AttendanceStatusType }[]
    },
    enabled: !!courseId && !!semesterId,
  })

  const existingMap = useMemo(() => {
    const map: Record<string, AttendanceStatusType> = {}
    for (const r of (existingAttendance || [])) {
      if (r.studentId) {
        map[r.studentId] = r.status
      }
    }
    return map
  }, [existingAttendance])

  // Local state for status overrides (remounted via key when course/date changes)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AttendanceStatusType>>({})

  const getStatus = useCallback((studentId: string): AttendanceStatusType => {
    return statusOverrides[studentId] || existingMap[studentId] || 'PRESENT'
  }, [statusOverrides, existingMap])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!courseId || !semesterId) throw new Error('Missing course or semester')
      const allStatuses: Record<string, AttendanceStatusType> = {}
      if (enrollments) {
        for (const e of enrollments) {
          allStatuses[e.student.id] = getStatus(e.student.id)
        }
      }
      const records = Object.entries(allStatuses).map(([studentId, status]) => ({
        studentId,
        status,
      }))
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          semesterId,
          date: dateStr,
          markedBy: userId,
          records,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-date'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-course-summary'] })
      toast.success('Attendance saved successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSelectAllPresent = () => {
    if (!enrollments) return
    const all: Record<string, AttendanceStatusType> = {}
    for (const e of enrollments) {
      all[e.student.id] = 'PRESENT'
    }
    setStatusOverrides(all)
  }

  const handleStatusChange = (studentId: string, status: AttendanceStatusType) => {
    setStatusOverrides((prev) => ({ ...prev, [studentId]: status }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50'
      case 'ABSENT': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/50'
      case 'LATE': return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/50'
      case 'EXCUSED': return 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-950/50'
      default: return ''
    }
  }

  const isReady = !isLoadingStudents && !isLoadingExisting

  return (
    <div className="space-y-4">
      {/* Actions row */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            {isReady && enrollments && enrollments.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleSelectAllPresent} className="h-9">
                  <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-500" />
                  Mark All Present
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="h-9"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          {isLoadingStudents || isLoadingExisting ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !enrollments || enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCheck className="size-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No students enrolled in this course</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[50px] text-center">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-[120px]">Student ID</TableHead>
                    <TableHead className="w-[160px] text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e, idx) => {
                    const status = getStatus(e.student.id)
                    const wasExisting = !!existingMap[e.student.id]
                    return (
                      <TableRow
                        key={e.student.id}
                        className={cn(
                          'transition-colors',
                          STATUS_BG[status],
                          wasExisting && 'opacity-80'
                        )}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {e.student.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {e.student.studentId}
                        </TableCell>
                        <TableCell className="text-center">
                          <Select
                            value={status}
                            onValueChange={(v) => handleStatusChange(e.student.id, v as AttendanceStatusType)}
                          >
                            <SelectTrigger className={cn(
                              'h-8 w-[140px] text-xs font-medium border-0',
                              getStatusColor(status)
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  <span className={opt.color}>{opt.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============== MAIN ATTENDANCE MODULE ==============
export function AttendanceModule() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('')
  const [selectedAcademicSemester, setSelectedAcademicSemester] = useState<string>('_all')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30))
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState('mark')

  // Queries
  const { data: semesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => fetch('/api/semesters').then((r) => r.json()).then((d) => d.data as Semester[]),
  })

  const currentSemesterId = useMemo(() => {
    if (selectedSemester) return selectedSemester
    return semesters?.find((s) => s.isCurrent)?.id || semesters?.[0]?.id || ''
  }, [semesters, selectedSemester])

  const isFaculty = user?.role === 'FACULTY'

  // Faculty: only the courses assigned to them this semester
  const { data: facultyOfferings } = useQuery({
    queryKey: ['faculty-offerings', currentSemesterId],
    queryFn: () =>
      fetch(`/api/faculty/me/offerings?semesterId=${currentSemesterId}`)
        .then((r) => r.json())
        .then((d: any) => d.data?.offerings || []),
    enabled: isFaculty && !!currentSemesterId,
  })

  // Admin: all courses
  const { data: allCourses } = useQuery({
    queryKey: ['courses-attendance', currentSemesterId],
    queryFn: () => fetch('/api/courses?limit=100').then((r) => r.json()).then((d: any) => (d.data || d || []) as Course[]),
    enabled: !isFaculty && !!currentSemesterId,
  })

  const courses = useMemo(() => {
    if (isFaculty) {
      return (facultyOfferings || []).map((o: any) => ({
        id: o.course.id,
        code: o.course.code,
        name: o.course.name,
        courseType: o.course.courseType,
        semesterOffered: o.course.semesterOffered,
      }))
    }
    return allCourses || []
  }, [isFaculty, facultyOfferings, allCourses])

  // Filter courses by selected academic semester
  const filteredCourses = useMemo(() => {
    if (!courses) return []
    if (isFaculty || selectedAcademicSemester === '_all') return courses
    const targetSem = parseInt(selectedAcademicSemester, 10)
    return courses.filter((c) => c.semesterOffered === targetSem)
  }, [courses, selectedAcademicSemester, isFaculty])

  // Reset course selection if it is no longer in the filtered list
  useEffect(() => {
    if (selectedCourseId) {
      const exists = filteredCourses.some((c) => c.id === selectedCourseId)
      if (!exists) {
        setSelectedCourseId('')
      }
    }
  }, [filteredCourses, selectedCourseId])

  // Course attendance summary (for Summary tab)
  const { data: courseSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['attendance-course-summary', selectedCourseId, currentSemesterId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (currentSemesterId) params.set('semesterId', currentSemesterId)
      const res = await fetch(`/api/attendance/course/${selectedCourseId}/summary?${params}`)
      const json = await res.json()
      return json.data as AttendanceSummaryItem[]
    },
    enabled: !!selectedCourseId && activeTab === 'summary',
  })

  // Reports (for Reports tab)
  const { data: reports } = useQuery({
    queryKey: ['attendance-reports', selectedCourseId, format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd'), currentSemesterId],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
      })
      if (selectedCourseId) params.set('courseId', selectedCourseId)
      if (currentSemesterId) params.set('semesterId', currentSemesterId)
      const res = await fetch('/api/attendance/reports?' + params)
      const json = await res.json()
      return json.data as any
    },
    enabled: activeTab === 'history',
  })

  const getPercentageColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400'
    if (pct >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getPercentageBarColor = (pct: number) => {
    if (pct >= 75) return '[&>div]:bg-emerald-500'
    if (pct >= 50) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-red-500'
  }

  // Key for remounting the mark attendance panel
  const markPanelKey = `${selectedCourseId}-${currentSemesterId}-${format(selectedDate, 'yyyy-MM-dd')}`

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Attendance"
        description="Track and manage class attendance"
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Session</Label>
              <Select value={selectedSemester || currentSemesterId} onValueChange={(v) => setSelectedSemester(v === '__none__' ? '' : v)}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {semesters?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.isCurrent && '✓'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Academic Semester</Label>
              <Select value={selectedAcademicSemester} onValueChange={setSelectedAcademicSemester}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      Semester {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>             <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-[250px] h-9">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCourses.map((c) => (
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

            {activeTab === 'mark' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] h-9 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 size-3.5" />
                      {format(selectedDate, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => d && setSelectedDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mark" className="gap-1.5">
            <UserCheck className="size-3.5" />
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Course Summary
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="size-3.5" />
            Previous Records
          </TabsTrigger>
        </TabsList>

        {/* ===== MARK ATTENDANCE TAB ===== */}
        <TabsContent value="mark" className="mt-4 space-y-4">
          {/* Mark attendance panel - remounts on key change for clean state */}
          {selectedCourseId && currentSemesterId ? (
            <MarkAttendancePanel
              key={markPanelKey}
              courseId={selectedCourseId}
              semesterId={currentSemesterId}
              selectedDate={selectedDate}
              userId={user?.id || ''}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardCheck className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select a course to mark attendance</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== VIEW REPORTS TAB ===== */}
        <TabsContent value="summary" className="mt-4 space-y-4">
          {!selectedCourseId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select a course to view attendance reports</p>
              </CardContent>
            </Card>
          ) : isLoadingSummary ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
          ) : !courseSummary || courseSummary.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No attendance data available for this course</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4">
                  <div className="text-2xl font-bold">{courseSummary.length}</div>
                  <div className="text-xs text-muted-foreground">Total Students</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-emerald-600">
                    {courseSummary.filter((s) => s.percentage >= 75).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Good (&ge;75%)</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-amber-600">
                    {courseSummary.filter((s) => s.percentage >= 50 && s.percentage < 75).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Warning (50-75%)</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {courseSummary.filter((s) => s.percentage < 50).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Critical (&lt;50%)</div>
                </Card>
              </div>

              {/* Summary Table */}
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="w-[80px] text-center">Present</TableHead>
                          <TableHead className="w-[80px] text-center">Total</TableHead>
                          <TableHead className="w-[140px]">Percentage</TableHead>
                          <TableHead className="w-[100px] text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courseSummary.map((s, idx) => (
                          <TableRow
                            key={s.studentId}
                            className={cn(
                              s.percentage >= 75 && 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
                              s.percentage < 50 && 'bg-red-50/50 dark:bg-red-950/20'
                            )}
                          >
                            <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium text-sm">{s.studentName}</TableCell>
                            <TableCell className="text-center text-sm font-medium text-emerald-600">{s.present}</TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">{s.total}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={s.percentage}
                                  className={cn('h-2 flex-1', getPercentageBarColor(s.percentage))}
                                />
                                <span className={cn('text-xs font-bold w-10 text-right', getPercentageColor(s.percentage))}>
                                  {s.percentage}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-medium',
                                  s.percentage >= 75 && 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400',
                                  s.percentage >= 50 && s.percentage < 75 && 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400',
                                  s.percentage < 50 && 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400',
                                )}
                              >
                                {s.percentage >= 75 ? 'Good' : s.percentage >= 50 ? 'Warning' : 'Critical'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ===== HISTORY / PREVIOUS RECORDS TAB ===== */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[180px] h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 size-3.5" />
                        {format(dateFrom, 'MMM dd, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(d) => d && setDateFrom(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[180px] h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 size-3.5" />
                        {format(dateTo, 'MMM dd, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(d) => d && setDateTo(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats overview */}
          {reports?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="text-2xl font-bold">{reports.stats.totalRecords}</div>
                <div className="text-xs text-muted-foreground">Total Attendance Records</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-emerald-600">
                  {reports.stats.overallPercentage}%
                </div>
                <div className="text-xs text-muted-foreground">Average Attendance Rate</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {reports.stats.totalPresent}
                </div>
                <div className="text-xs text-muted-foreground">Total Present (incl. Late)</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {reports.stats.totalAbsent}
                </div>
                <div className="text-xs text-muted-foreground">Total Absent</div>
              </Card>
            </div>
          )}

          {/* History log list */}
          <Card>
            <CardContent className="p-0">
              {!reports?.dailyBreakdown || reports.dailyBreakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="size-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No attendance records found for this period</p>
                </div>
              ) : (
                <div className="divide-y">
                  {reports.dailyBreakdown.map((dayItem: any) => {
                    const parsedDate = new Date(dayItem.date)
                    const formattedDayName = format(parsedDate, 'EEEE')
                    const formattedDateStr = format(parsedDate, 'MMM dd, yyyy')

                    return (
                      <div key={dayItem.date} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <span className="text-primary">{formattedDayName}</span>
                            <span className="text-muted-foreground font-normal">| {formattedDateStr}</span>
                          </h4>
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {dayItem.courses.length} Course(s)
                          </Badge>
                        </div>

                        <div className="grid gap-2">
                          {dayItem.courses.map((cItem: any) => {
                            const attendanceRate = cItem.total > 0 ? Math.round(((cItem.present + cItem.late) / cItem.total) * 100) : 0
                            return (
                              <div
                                key={cItem.courseId}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-primary">{cItem.courseCode}</span>
                                    <span className="text-sm font-medium">{cItem.courseName}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span>Present: <strong className="text-emerald-600 font-semibold">{cItem.present}</strong></span>
                                    <span>Late: <strong className="text-amber-600 font-semibold">{cItem.late}</strong></span>
                                    <span>Absent: <strong className="text-red-600 font-semibold">{cItem.absent}</strong></span>
                                    <span>Excused: <strong className="text-sky-600 font-semibold">{cItem.excused}</strong></span>
                                    <span>Total Students: <strong>{cItem.total}</strong></span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 self-end sm:self-center">
                                  <div className="flex items-center gap-2 w-[120px] sm:w-[150px]">
                                    <Progress value={attendanceRate} className={cn('h-1.5 flex-1', getPercentageBarColor(attendanceRate))} />
                                    <span className={cn('text-xs font-bold w-9 text-right', getPercentageColor(attendanceRate))}>
                                      {attendanceRate}%
                                    </span>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const [y, m, d] = dayItem.date.split('-').map(Number)
                                      const localDate = new Date(y, m - 1, d)
                                      setSelectedDate(localDate)
                                      setSelectedCourseId(cItem.courseId)
                                      setActiveTab('mark')
                                    }}
                                    className="h-8 text-xs font-medium gap-1"
                                  >
                                    <ClipboardCheck className="size-3" />
                                    View / Edit
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
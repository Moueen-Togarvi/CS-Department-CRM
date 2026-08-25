'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardList,
  Plus,
  Trash2,
  Loader2,
  GraduationCap,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { cn } from '@/lib/utils'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

// ============== TYPES ==============
interface Course {
  id: string
  code: string
  name: string
  courseType: string
  semesterOffered?: number | null
  creditHours: number
}

interface Faculty {
  id: string
  facultyId: string
  designation: string
  user: { name: string }
}

interface Assignment {
  id: string
  courseId: string
  facultyId: string
  section: string
  slotType: string
  isActive: boolean
  course: Course
  faculty: Faculty
  semester?: { id: string; name: string; isCurrent: boolean } | null
}

const SHIFTS = ['Morning', 'Evening'] as const
type Shift = (typeof SHIFTS)[number]

/**
 * Letter part of a section; the shift is prepended when the offering is saved
 * ("Morning" + "A" -> "Morning A"). Both shifts run A and B, matching the
 * options the student form offers — Morning previously stopped at A, so a
 * "Morning B" student's course could never be assigned a teacher.
 */
function sectionsForShift(_shift: Shift): string[] {
  return ['A', 'B']
}

function parseSection(section: string): { shift: string; letter: string } {
  const parts = (section || '').split(' ')
  if (parts.length >= 2) {
    return { shift: parts[0], letter: parts[parts.length - 1] }
  }
  return { shift: '', letter: section || '' }
}

// ============== ASSIGN DIALOG ==============
function AssignDialog({
  open,
  onOpenChange,
  courses,
  faculty,
  preselectedCourseId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  courses: Course[]
  faculty: Faculty[]
  preselectedCourseId?: string
}) {
  const queryClient = useQueryClient()
  const [courseId, setCourseId] = useState<string>(preselectedCourseId || '')
  const [shift, setShift] = useState<Shift>('Morning')
  const [sectionLetter, setSectionLetter] = useState<string>('A')
  const [slotType, setSlotType] = useState<string>('THEORY')
  const [facultyId, setFacultyId] = useState<string>('')

  // Parent remounts this component (via key) on each open, so initial state above
  // is freshly applied — no reset effect needed.

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!courseId || !facultyId) throw new Error('Select course and faculty')
      const composedSection = `${shift} ${sectionLetter}`
      const res = await fetch(`/api/courses/${courseId}/offerings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facultyId, section: composedSection, slotType }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      toast.success('Faculty assigned successfully')
      queryClient.invalidateQueries({ queryKey: ['course-assignment'] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to assign faculty'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Assign Faculty to Section</DialogTitle>
          <DialogDescription>
            Select a course, section and faculty member. This controls which students the faculty sees in attendance and results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select
                value={shift}
                onValueChange={(v) => {
                  setShift(v as Shift)
                  setSectionLetter('A')
                }}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={sectionLetter} onValueChange={setSectionLetter}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sectionsForShift(shift).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Slot Type</Label>
              <Select value={slotType} onValueChange={setSlotType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="THEORY">Theory</SelectItem>
                  <SelectItem value="LAB">Lab</SelectItem>
                  <SelectItem value="PROJECT">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Faculty</Label>
            <Select value={facultyId} onValueChange={setFacultyId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select faculty" /></SelectTrigger>
              <SelectContent>
                {faculty.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.user.name} ({f.facultyId}){f.designation ? ` · ${f.designation}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Assigned section:{' '}
            <Badge variant="secondary" className="ml-1 font-semibold">
              {shift} {sectionLetter}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>
            {assignMutation.isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            Assign Faculty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============== MAIN MODULE ==============
export function CourseAssignmentModule() {
  const queryClient = useQueryClient()

  const [selectedSemesterOffered, setSelectedSemesterOffered] = useState<string>('1')
  const [shiftFilter, setShiftFilter] = useState<string>('all')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [preselectedCourseId, setPreselectedCourseId] = useState<string | undefined>(undefined)
  const [dialogKey, setDialogKey] = useState(0)

  // Assignment data
  const { data, isLoading } = useQuery({
    queryKey: ['course-assignment', selectedSemesterOffered],
    queryFn: async () => {
      const res = await fetch(`/api/course-assignment?semesterOffered=${selectedSemesterOffered}`)
      const json = await res.json()
      return json.data as {
        assignments: Assignment[]
        courses: Course[]
        faculty: Faculty[]
        semesterOffered: number | null
      }
    },
    enabled: !!selectedSemesterOffered,
  })

  const assignments = data?.assignments || []
  const courses = data?.courses || []
  const faculty = data?.faculty || []

  const [pendingRemoval, setPendingRemoval] = useState<Assignment | null>(null)

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: async ({ courseId, offeringId }: { courseId: string; offeringId: string }) => {
      const res = await fetch(`/api/courses/${courseId}/offerings/${offeringId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      toast.success('Assignment removed')
      setPendingRemoval(null)
      queryClient.invalidateQueries({ queryKey: ['course-assignment'] })
    },
    onError: (err: Error) => {
      setPendingRemoval(null)
      toast.error(err.message || 'Failed to remove assignment')
    },
  })

  // Filtering
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const { shift, letter } = parseSection(a.section)
      if (shiftFilter !== 'all' && shift.toLowerCase() !== shiftFilter.toLowerCase()) return false
      if (sectionFilter !== 'all' && letter !== sectionFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${a.course.code} ${a.course.name} ${a.faculty?.user?.name || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [assignments, shiftFilter, sectionFilter, search])

  // Section letter options derived from current filter context
  const sectionOptions = useMemo(() => {
    const letters = new Set<string>()
    for (const a of assignments) {
      const { letter } = parseSection(a.section)
      if (letter) letters.add(letter)
    }
    return Array.from(letters).sort()
  }, [assignments])

  // Gap detection: courses with no assignment for this semester (within shift filter)
  const assignedCourseIds = useMemo(() => new Set(assignments.map((a) => a.courseId)), [assignments])
  const unassignedCourses = useMemo(() => {
    return courses.filter((c) => {
      if (assignedCourseIds.has(c.id)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${c.code} ${c.name}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [courses, assignedCourseIds, search])

  const stats = useMemo(
    () => ({
      total: assignments.length,
      assignedCourses: assignedCourseIds.size,
      unassigned: unassignedCourses.length,
      faculty: new Set(assignments.map((a) => a.facultyId)).size,
    }),
    [assignments, assignedCourseIds, unassignedCourses]
  )

  const openAssignFor = (courseId?: string) => {
    setPreselectedCourseId(courseId)
    setDialogKey((k) => k + 1)
    setAssignOpen(true)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Course Assignment"
        description="Assign faculty to course sections — this scopes attendance and results to the right students."
        actions={
          <Button onClick={() => openAssignFor(undefined)} className="h-9">
            <Plus className="size-4 mr-1.5" />
            Assign Faculty
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Semester</Label>
              <Select
                value={selectedSemesterOffered}
                onValueChange={setSelectedSemesterOffered}
              >
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((sem) => (
                    <SelectItem key={sem} value={String(sem)}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Shift</Label>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  {SHIFTS.map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Section</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sectionOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Course code, name or faculty..."
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ClipboardList className="size-3.5" /> Total Assignments
          </div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Assigned Courses
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.assignedCourses}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="size-3.5 text-amber-600" /> Unassigned Courses
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{stats.unassigned}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5 text-sky-600" /> Faculty Involved
          </div>
          <div className="text-2xl font-bold mt-1 text-sky-600">{stats.faculty}</div>
        </Card>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="size-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No assignments found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {assignments.length === 0
                  ? 'Assign faculty to course sections to get started.'
                  : 'Try adjusting the filters.'}
              </p>
              {assignments.length === 0 && (
                <Button size="sm" className="mt-4" onClick={() => openAssignFor(undefined)}>
                  <Plus className="size-4 mr-1.5" /> Assign Faculty
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Course</TableHead>
                    <TableHead className="w-[140px]">Section</TableHead>
                    <TableHead className="w-[100px]">Slot</TableHead>
                    <TableHead className="w-[160px]">Offer Semester</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead className="w-[60px] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((a) => {
                    const { shift, letter } = parseSection(a.section)
                    const isEvening = shift.toLowerCase().includes('evening')
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{a.course.code}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                              {a.course.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {shift && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-semibold',
                                  isEvening
                                    ? 'text-sky-600 border-sky-300'
                                    : 'text-emerald-600 border-emerald-300'
                                )}
                              >
                                {shift}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs font-semibold">
                              Sec {letter}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {a.slotType === 'LAB' ? 'Lab' : a.slotType === 'PROJECT' ? 'Project' : 'Theory'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {a.course.semesterOffered ? `Semester ${a.course.semesterOffered}` : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{a.faculty?.user?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{a.faculty?.designation || ''}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                            disabled={removeMutation.isPending}
                            onClick={() => setPendingRemoval(a)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
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

      {/* Unassigned courses (gap detection) */}
      {unassignedCourses.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertCircle className="size-4 text-amber-600" />
                  Courses without an assignment
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These courses have no faculty assigned for Semester {selectedSemesterOffered}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassignedCourses.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => openAssignFor(c.id)}
                >
                  <Plus className="size-3 mr-1" />
                  {c.code}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AssignDialog
        key={dialogKey}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        courses={courses}
        faculty={faculty}
        preselectedCourseId={preselectedCourseId}
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title="Remove this assignment?"
        description={
          pendingRemoval
            ? `${pendingRemoval.faculty?.user?.name || 'This faculty member'} will no longer be assigned to ${pendingRemoval.course.code} (${pendingRemoval.section} · ${pendingRemoval.slotType === 'LAB' ? 'Lab' : 'Theory'}). Attendance and results they have already recorded are kept.`
            : ''
        }
        confirmLabel="Remove"
        pendingLabel="Removing..."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          pendingRemoval &&
          removeMutation.mutate({ courseId: pendingRemoval.courseId, offeringId: pendingRemoval.id })
        }
      />
    </div>
  )
}

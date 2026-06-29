'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Clock,
  MapPin,
  Users,
  Building,
  AlertTriangle,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { PageHeader } from '@/components/shared/page-header'

// ============== TYPES ==============
interface Semester {
  id: string
  name: string
  type: string
  year: number
  status: string
  isCurrent: boolean
}

interface Room {
  id: string
  name: string
  building: string
  capacity: number
  roomType: string
  isAvailable: boolean
}

interface FacultyItem {
  id: string
  facultyId: string
  name: string
  designation: string
}

interface CourseItem {
  id: string
  code: string
  name: string
  courseType: string
}

interface GridSlot {
  id: string
  course: { id: string; code: string; name: string; courseType: string }
  faculty: { id: string; name: string; designation: string }
  room: { id: string; name: string; building: string }
  section: string
  startTime: string
  endTime: string
  slotType: string
  span: number
}

interface WeeklyData {
  days: string[]
  timeSlots: string[]
  grid: Record<string, Record<string, GridSlot[]>>
}

interface TimetableSlot {
  id: string
  courseId: string
  course: { id: string; code: string; name: string; courseType: string; creditHours: number }
  facultyId: string
  faculty: { id: string; facultyId: string; name: string; designation: string }
  semesterId: string
  roomId: string
  room: { id: string; name: string; building: string; roomType: string }
  section: string
  day: string
  startTime: string
  endTime: string
  slotType: string
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
}
const DAY_FULL: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
}

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

const SLOT_TYPE_BG: Record<string, string> = {
  THEORY: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-100',
  LAB: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100',
  PROJECT: 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-100',
  SEMINAR: 'bg-cyan-50 border-cyan-200 text-cyan-900 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-100',
}

const SLOT_TYPE_DOT: Record<string, string> = {
  THEORY: 'bg-emerald-500',
  LAB: 'bg-amber-500',
  PROJECT: 'bg-rose-500',
  SEMINAR: 'bg-cyan-500',
}

const SLOT_TYPE_OPTIONS = ['THEORY', 'LAB', 'PROJECT', 'SEMINAR']

type ViewMode = 'section' | 'faculty' | 'room'

export function TimetableModule() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'

  const [selectedSemester, setSelectedSemester] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [selectedFaculty, setSelectedFaculty] = useState<string>('')
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('section')

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null)
  const [deletingSlot, setDeletingSlot] = useState<TimetableSlot | null>(null)

  const [formCourseId, setFormCourseId] = useState('')
  const [formFacultyId, setFormFacultyId] = useState('')
  const [formRoomId, setFormRoomId] = useState('')
  const [formSection, setFormSection] = useState('A')
  const [formDay, setFormDay] = useState('MONDAY')
  const [formStartTime, setFormStartTime] = useState('09:00')
  const [formEndTime, setFormEndTime] = useState('10:00')
  const [formSlotType, setFormSlotType] = useState('THEORY')
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ---- Queries ----
  const { data: semesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => fetch('/api/semesters').then((r) => r.json()).then((d) => d.data as Semester[]),
  })

  const currentSemester = useMemo(() => {
    if (selectedSemester) return selectedSemester
    return semesters?.find((s) => s.isCurrent)?.id || semesters?.[0]?.id || ''
  }, [semesters, selectedSemester])

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => fetch('/api/rooms').then((r) => r.json()).then((d) => d.data as Room[]),
  })

  const { data: facultyList } = useQuery({
    queryKey: ['faculty-list-tt'],
    queryFn: () => fetch('/api/faculty?limit=100').then((r) => r.json()).then((d: any) =>
      (d.data || []).map((f: any) => ({
        id: f.id,
        facultyId: f.facultyId,
        name: f.name,
        designation: f.designation,
      } as FacultyItem))
    ),
  })

  const { data: allCourses } = useQuery({
    queryKey: ['all-courses-tt'],
    queryFn: () => fetch('/api/courses?limit=100').then((r) => r.json()).then((d: any) =>
      (d.data || d || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        courseType: c.courseType,
      } as CourseItem))
    ),
  })

  // Weekly grid
  const effectiveSection = selectedSection && selectedSection !== '__all__' ? selectedSection : undefined
  const effectiveFaculty = selectedFaculty && selectedFaculty !== '__all__' ? selectedFaculty : undefined
  const effectiveRoom = selectedRoom && selectedRoom !== '__all__' ? selectedRoom : undefined

  const { data: weeklyData, isLoading: isLoadingGrid } = useQuery({
    queryKey: ['timetable-weekly', currentSemester, effectiveSection, viewMode, effectiveFaculty, effectiveRoom],
    queryFn: async () => {
      const params = new URLSearchParams({ semesterId: currentSemester })
      if (effectiveSection) params.set('section', effectiveSection)
      if (viewMode === 'faculty' && effectiveFaculty) params.set('facultyId', effectiveFaculty)
      if (viewMode === 'room' && effectiveRoom) params.set('roomId', effectiveRoom)
      const res = await fetch('/api/timetable/weekly?' + params.toString())
      const json = await res.json()
      return json.data as WeeklyData
    },
    enabled: !!currentSemester,
  })

  const sections = useMemo(() => {
    if (!weeklyData) return []
    const set = new Set<string>()
    for (const day of weeklyData.days) {
      for (const ts of weeklyData.timeSlots) {
        for (const s of (weeklyData.grid[day]?.[ts] || [])) {
          if (s.section) set.add(s.section)
        }
      }
    }
    return Array.from(set).sort()
  }, [weeklyData])

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-weekly'] })
      queryClient.invalidateQueries({ queryKey: ['timetable-list'] })
      toast.success('Slot created successfully')
      closeDialog()
    },
    onError: (err: Error) => setConflictWarning(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/timetable/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-weekly'] })
      queryClient.invalidateQueries({ queryKey: ['timetable-list'] })
      toast.success('Slot updated successfully')
      closeDialog()
    },
    onError: (err: Error) => setConflictWarning(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/timetable/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-weekly'] })
      queryClient.invalidateQueries({ queryKey: ['timetable-list'] })
      toast.success('Slot deleted')
      setDeletingSlot(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ---- Handlers ----
  function openCreateDialog() {
    setEditingSlot(null)
    setConflictWarning(null)
    setFormCourseId('')
    setFormFacultyId('')
    setFormRoomId('')
    setFormSection('A')
    setFormDay('MONDAY')
    setFormStartTime('09:00')
    setFormEndTime('10:00')
    setFormSlotType('THEORY')
    setShowCreateDialog(true)
  }

  function openEditDialog(slot: TimetableSlot) {
    setEditingSlot(slot)
    setConflictWarning(null)
    setFormCourseId(slot.courseId)
    setFormFacultyId(slot.facultyId)
    setFormRoomId(slot.roomId)
    setFormSection(slot.section)
    setFormDay(slot.day)
    setFormStartTime(slot.startTime)
    setFormEndTime(slot.endTime)
    setFormSlotType(slot.slotType)
    setShowCreateDialog(true)
  }

  function closeDialog() {
    setShowCreateDialog(false)
    setEditingSlot(null)
    setConflictWarning(null)
    setIsSaving(false)
  }

  function handleSave() {
    if (!formCourseId || !formFacultyId || !formRoomId || !currentSemester) {
      toast.error('Please fill all required fields')
      return
    }
    setIsSaving(true)
    setConflictWarning(null)
    const data = {
      courseId: formCourseId,
      facultyId: formFacultyId,
      semesterId: currentSemester,
      roomId: formRoomId,
      section: formSection,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      slotType: formSlotType,
    }
    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  // ---- Build flat slot list for the grid ----
  const flatSlots = useMemo(() => {
    if (!weeklyData) return []
    const result: (GridSlot & { _dayIdx: number; _tsIdx: number })[] = []
    for (const day of weeklyData.days) {
      const dayIdx = weeklyData.days.indexOf(day)
      for (const ts of weeklyData.timeSlots) {
        for (const s of (weeklyData.grid[day]?.[ts] || [])) {
          const tsIdx = weeklyData.timeSlots.indexOf(ts)
          result.push({ ...s, _dayIdx: dayIdx, _tsIdx: tsIdx })
        }
      }
    }
    return result
  }, [weeklyData])

  // ---- Render ----
  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Timetable"
        description="View and manage class schedules"
        actions={
          isAdmin && (
            <Button onClick={openCreateDialog} size="sm">
              <Plus className="size-4 mr-1.5" />
              Add Slot
            </Button>
          )
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Semester</Label>
              <Select value={selectedSemester || currentSemester} onValueChange={(v) => setSelectedSemester(v === '__none__' ? '' : v)}>
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

            {sections.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Section</Label>
                <Select value={selectedSection || '__all__'} onValueChange={setSelectedSection}>
                  <SelectTrigger className="w-[110px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">View</Label>
              <div className="flex rounded-md border overflow-hidden h-9">
                {([
                  { key: 'section' as ViewMode, label: 'Section', icon: Users },
                  { key: 'faculty' as ViewMode, label: 'Faculty', icon: Users },
                  { key: 'room' as ViewMode, label: 'Room', icon: Building },
                ]).map((mode, i) => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5',
                      viewMode === mode.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-accent text-foreground',
                      i < 2 && 'border-r'
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {viewMode === 'faculty' && facultyList && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Faculty</Label>
                <Select value={selectedFaculty || '__all__'} onValueChange={setSelectedFaculty}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Faculty</SelectItem>
                    {facultyList.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {viewMode === 'room' && rooms && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Room</Label>
                <Select value={selectedRoom || '__all__'} onValueChange={setSelectedRoom}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Rooms</SelectItem>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name} ({r.building})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoadingGrid ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : weeklyData && weeklyData.days.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[780px]">
                {/* Header */}
                <div className="grid sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b"
                  style={{ gridTemplateColumns: '72px repeat(6, 1fr)' }}>
                  <div className="p-2 text-[11px] font-semibold text-muted-foreground border-r flex items-center justify-center">
                    <Clock className="size-3 mr-1" />
                    Time
                  </div>
                  {weeklyData.days.map((day, idx) => (
                    <div key={day} className={cn(
                      'p-2 text-center border-r last:border-r-0',
                      idx === 0 && 'border-l-0'
                    )}>
                      <div className="text-xs font-bold">{DAY_LABELS[day]}</div>
                      <div className="text-[10px] text-muted-foreground hidden sm:block">{DAY_FULL[day]}</div>
                    </div>
                  ))}
                </div>

                {/* Body - flat grid approach */}
                <div className="relative"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '72px repeat(6, 1fr)',
                    gridTemplateRows: `repeat(${weeklyData.timeSlots.length}, 64px)`,
                  }}>
                  {/* Time labels */}
                  {weeklyData.timeSlots.map((ts, tsIdx) => (
                    <div
                      key={ts}
                      className="absolute left-0 border-r border-b flex items-center justify-center bg-muted/30 z-[1]"
                      style={{
                        gridColumn: '1',
                        gridRow: `${tsIdx + 1}`,
                        width: '72px',
                        height: '64px',
                      }}
                    >
                      <span className="text-[11px] font-mono font-semibold text-muted-foreground">{ts}</span>
                    </div>
                  ))}

                  {/* Empty cells (background grid) */}
                  {weeklyData.days.map((day, dayIdx) => {
                    return weeklyData.timeSlots.map((ts, tsIdx) => (
                      <div
                        key={`${day}-${ts}`}
                        className="border-b border-r last:border-r-0 hover:bg-muted/10 transition-colors"
                        style={{
                          gridColumn: `${dayIdx + 2}`,
                          gridRow: `${tsIdx + 1}`,
                        }}
                      />
                    ))
                  })}

                  {/* Slot cards - positioned absolutely in the grid */}
                  {flatSlots.map((slot) => {
                    const tsIdx = weeklyData.timeSlots.indexOf(slot.startTime)
                    const span = Math.max(1, slot.span || 1)
                    const typeBg = SLOT_TYPE_BG[slot.slotType] || SLOT_TYPE_BG.THEORY

                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          'relative z-[2] rounded-md border m-0.5 p-1.5 overflow-hidden transition-shadow hover:shadow-md cursor-pointer',
                          typeBg
                        )}
                        style={{
                          gridColumn: `${slot._dayIdx! + 2}`,
                          gridRow: `${tsIdx + 1} / span ${Math.min(span, weeklyData.timeSlots.length - tsIdx)}`,
                        }}
                        onClick={() => {
                          if (isAdmin) {
                            // Find full slot from list for editing
                            toast.info(`${slot.course.code} - Click edit in list below`)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[11px] font-extrabold leading-tight truncate">
                            {slot.course.code}
                          </span>
                          {isAdmin && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // We'll find the slot from the list
                                  const fakeSlot: any = {
                                    id: slot.id,
                                    courseId: slot.course.id,
                                    course: slot.course,
                                    facultyId: slot.faculty.id,
                                    faculty: { id: slot.faculty.id, facultyId: '', name: slot.faculty.name, designation: slot.faculty.designation },
                                    semesterId: currentSemester,
                                    roomId: slot.room.id,
                                    room: slot.room,
                                    section: slot.section,
                                    day: weeklyData.days[slot._dayIdx!],
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                    slotType: slot.slotType,
                                  }
                                  openEditDialog(fakeSlot)
                                }}
                                className="size-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                              >
                                <Pencil className="size-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const fakeSlot: any = {
                                    id: slot.id,
                                    course: slot.course,
                                    day: weeklyData.days[slot._dayIdx!],
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                  }
                                  setDeletingSlot(fakeSlot)
                                }}
                                className="size-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] leading-tight opacity-75 line-clamp-1 mt-0.5">
                          {slot.course.name}
                        </p>
                        <div className="flex items-center gap-1 text-[9px] opacity-65 mt-0.5">
                          <MapPin className="size-2.5 shrink-0" />
                          <span className="truncate">{slot.room.name}</span>
                        </div>
                        {span > 1 && (
                          <div className="flex items-center gap-1 text-[9px] opacity-65">
                            <Clock className="size-2.5 shrink-0" />
                            <span>{slot.startTime}-{slot.endTime}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[9px] opacity-65">
                          <Users className="size-2.5 shrink-0" />
                          <span className="truncate">{slot.faculty.name}</span>
                        </div>
                        {slot.section && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 mt-0.5 w-fit">
                            Sec {slot.section}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-t bg-muted/20 flex-wrap">
                  <span className="text-[11px] font-medium text-muted-foreground">Type:</span>
                  {SLOT_TYPE_OPTIONS.map((t) => (
                    <div key={t} className="flex items-center gap-1.5">
                      <div className={cn('w-2.5 h-2.5 rounded-sm', SLOT_TYPE_DOT[t])} />
                      <span className="text-[11px] text-muted-foreground">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <CalendarDays className="size-14 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-medium text-muted-foreground">No Schedule Found</h3>
              <p className="text-sm text-muted-foreground/60 mt-1 max-w-sm">
                {currentSemester
                  ? 'No timetable slots exist for the selected filters.'
                  : 'Select a semester to view the schedule.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slot List */}
      <SlotList
        semesterId={currentSemester}
        section={effectiveSection}
        onEdit={openEditDialog}
        onDelete={(s) => setDeletingSlot(s)}
        isAdmin={isAdmin}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlot ? 'Edit Slot' : 'Add Timetable Slot'}</DialogTitle>
          </DialogHeader>

          {conflictWarning && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span className="flex-1">{conflictWarning}</span>
              <button onClick={() => setConflictWarning(null)} className="shrink-0"><X className="size-3.5" /></button>
            </div>
          )}

          <div className="grid gap-3.5 py-1">
            <div className="grid gap-1.5">
              <Label className="text-sm">Course *</Label>
              <Select value={formCourseId} onValueChange={setFormCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {allCourses?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm">Faculty *</Label>
              <Select value={formFacultyId} onValueChange={setFormFacultyId}>
                <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                <SelectContent>
                  {facultyList?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name} ({f.designation})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm">Room *</Label>
              <Select value={formRoomId} onValueChange={setFormRoomId}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {rooms?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} — {r.building} (Cap: {r.capacity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm">Day *</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>{DAY_FULL[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm">Start *</Label>
                <Select value={formStartTime} onValueChange={setFormStartTime}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm">End *</Label>
                <Select value={formEndTime} onValueChange={setFormEndTime}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.filter((t) => t > formStartTime).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm">Section</Label>
                <Input value={formSection} onChange={(e) => setFormSection(e.target.value)} placeholder="A" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm">Slot Type</Label>
                <Select value={formSlotType} onValueChange={setFormSlotType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOT_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2.5 h-2.5 rounded-sm', SLOT_TYPE_DOT[t])} />
                          {t}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingSlot ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSlot} onOpenChange={(o) => !o && setDeletingSlot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slot</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this timetable slot.
              {deletingSlot && (
                <span className="block mt-2 font-medium text-foreground">
                  {deletingSlot.course?.code} — {deletingSlot.day} {deletingSlot.startTime}–{deletingSlot.endTime}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSlot && deleteMutation.mutate(deletingSlot.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============== SLOT LIST ==============
function SlotList({
  semesterId,
  section,
  onEdit,
  onDelete,
  isAdmin,
}: {
  semesterId: string
  section: string | undefined
  onEdit: (slot: TimetableSlot) => void
  onDelete: (slot: TimetableSlot) => void
  isAdmin: boolean
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['timetable-list', semesterId, section],
    queryFn: async () => {
      const params = new URLSearchParams({ semesterId, limit: '100', sort: 'day', order: 'asc' })
      if (section) params.set('section', section)
      const res = await fetch('/api/timetable?' + params.toString())
      return res.json()
    },
    enabled: !!semesterId,
  })

  const slots: TimetableSlot[] = data?.data || []
  const total = data?.pagination?.total || 0

  if (!semesterId) return null

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">All Slots ({total})</h3>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No timetable slots found for this semester.</p>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 p-2.5 rounded-md border hover:bg-muted/30 transition-colors group"
              >
                <div className={cn('w-1.5 h-10 rounded-full shrink-0', SLOT_TYPE_DOT[slot.slotType])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{slot.course.code}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{slot.course.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                    <span>{DAY_LABELS[slot.day]}</span>
                    <span className="font-mono">{slot.startTime}–{slot.endTime}</span>
                    <span>{slot.faculty.name}</span>
                    <span className="flex items-center gap-0.5"><Building className="size-2.5" />{slot.room.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">Sec {slot.section}</Badge>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(slot)}>
                      <Pencil className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => onDelete(slot)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ColumnDef, type SortingState } from '@tanstack/react-table'
import { z } from 'zod'
import {
  Plus,
  Upload,
  MoreHorizontal,
  MoreVertical,
  Eye,
  Pencil,
  UserX,
  Search,
  GraduationCap,
  Calendar,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Mail,
  Phone,
  MapPin,
  Shield,
  Users,
  Loader2,
  Inbox,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Building2,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { useAuthStore } from '@/stores/auth-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import type { PaginatedResponse } from '@/types/api'
import { CsvImportDialog } from '@/components/shared/csv-import-dialog'
import type { ImportEntityType } from '@/components/shared/csv-import-dialog'
import { AiInput } from '@/components/shared/ai-input'

// ==================== Types ====================

interface StudentRow {
  id: string
  studentId: string
  name: string
  email: string
  batch: string | null
  currentSemester: number
  program: string
  gpa: number | null
  status: string
  gender: string | null
  department: { id: string; name: string; code: string }
  isActive: boolean
  profilePicture: string | null
  createdAt: string
  updatedAt: string
}

interface StudentStats {
  total: number
  active: number
  byBatch: Record<string, number>
  bySemester: Record<string, number>
  bySemesterSection: Array<{
    semester: number
    section: string
    count: number
    room?: string
    floor?: number | null
    building?: string | null
    shift?: string
  }>
}

interface StudentDetail {
  id: string
  studentId: string
  departmentId: string
  currentSemester: number
  enrollmentYear: number
  batch: string | null
  program: string
  status: string
  gpa: number | null
  totalCredits: number
  dateOfBirth: string | null
  gender: string | null
  address: string | null
  guardianName: string | null
  guardianPhone: string | null
  emergencyContact: string | null
  profilePicture: string | null
  fatherName: string | null
  cnic: string | null
  mobileNumber: string | null
  fatherPhone: string | null
  session: string | null
  section: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name: string
    phone: string | null
    avatar: string | null
    isActive: boolean
    lastLogin: string | null
    createdAt: string
  }
  department: {
    id: string
    name: string
    code: string
  }
  enrollments: {
    id: string
    section: string
    status: string
    enrollmentDate: string
    course: { id: string; code: string; name: string; creditHours: number }
    semester: { id: string; name: string; type: string; year: number }
  }[]
  results: {
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
    remarks: string | null
    course: { id: string; code: string; name: string; creditHours: number }
    semester: { id: string; name: string; type: string; year: number }
  }[]
  attendanceSummary: {
    courseId: string
    courseCode: string
    courseName: string
    total: number
    present: number
    late: number
    excused: number
    percentage: number
  }[]
}

// ==================== Form Schema ====================

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  studentId: z.string().min(1, 'Student ID is required').max(50),
  departmentId: z.string().optional(),
  currentSemester: z.coerce.number().int().min(1).max(12),
  enrollmentYear: z.coerce.number().int().min(2000).max(2100),
  batch: z.string().optional(),
  program: z.string().default('BS'),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  profilePicture: z.string().optional(),
  fatherName: z.string().optional(),
  cnic: z.string().optional(),
  mobileNumber: z.string().optional(),
  fatherPhone: z.string().optional(),
  session: z.string().optional(),
  shift: z.string().optional(),
  section: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

// ==================== Main Component ====================

export function StudentModule() {
  const isMobile = useIsMobile()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'ADMIN'

  // Filters
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')
  const [semesterFilter, setSemesterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [selectedGroup, setSelectedGroup] = useState<{ semester: number; section: string } | null>(null)
  const [cardSemesterFilter, setCardSemesterFilter] = useState('all')
  const [cardShiftFilter, setCardShiftFilter] = useState('all')
  const [cardSectionFilter, setCardSectionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([])

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [deactivateAlert, setDeactivateAlert] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  // Assign Room/Floor states
  const [assignRoomClass, setAssignRoomClass] = useState<{ semester: number; section: string; room?: string; floor?: number | null } | null>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('custom')
  const [customRoomName, setCustomRoomName] = useState<string>('')
  const [customFloor, setCustomFloor] = useState<string>('')
  const [isSavingRoom, setIsSavingRoom] = useState(false)

  const queryClient = useQueryClient()

  // Load rooms and prefill state
  useEffect(() => {
    if (assignRoomClass) {
      fetch('/api/rooms')
        .then((res) => res.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setRooms(res.data)
            // If the current class room matches one of the rooms in DB, select it
            const matchedRoom = res.data.find((r: any) => r.name === assignRoomClass.room)
            if (matchedRoom) {
              setSelectedRoomId(matchedRoom.id)
              setCustomRoomName(matchedRoom.name)
              setCustomFloor(String(matchedRoom.floor || ''))
            } else {
              setSelectedRoomId('custom')
              setCustomRoomName(assignRoomClass.room && assignRoomClass.room !== 'N/A' ? assignRoomClass.room : '')
              setCustomFloor(assignRoomClass.floor !== null && assignRoomClass.floor !== undefined ? String(assignRoomClass.floor) : '')
            }
          }
        })
        .catch(console.error)
    }
  }, [assignRoomClass])

  const handleSaveRoom = async () => {
    if (!assignRoomClass) return
    setIsSavingRoom(true)
    try {
      let finalRoomName = customRoomName.trim()
      let finalFloor = customFloor.trim() !== '' ? Number(customFloor) : null
      let roomId = null

      if (selectedRoomId !== 'custom') {
        const dbRoom = rooms.find((r) => r.id === selectedRoomId)
        if (dbRoom) {
          finalRoomName = dbRoom.name
          finalFloor = dbRoom.floor
          roomId = dbRoom.id
        }
      }

      const res = await fetch('/api/students/class-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: assignRoomClass.semester,
          section: assignRoomClass.section,
          roomId,
          roomName: finalRoomName || 'N/A',
          floor: finalFloor,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Classroom assignment updated successfully')
        queryClient.invalidateQueries({ queryKey: ['student-stats'] })
        setAssignRoomClass(null)
      } else {
        toast.error(data.error || 'Failed to update classroom assignment')
      }
    } catch (e) {
      console.error(e)
      toast.error('An error occurred while saving')
    } finally {
      setIsSavingRoom(false)
    }
  }

  // Build query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(pageSize))
    if (search) params.set('search', search)
    if (batchFilter !== 'all') params.set('batch', batchFilter)
    if (semesterFilter !== 'all') params.set('semester', semesterFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (sectionFilter !== 'all') params.set('section', sectionFilter)
    if (sorting.length > 0) {
      params.set('sort', sorting[0].id)
      params.set('order', sorting[0].desc ? 'desc' : 'asc')
    }
    return params.toString()
  }, [page, pageSize, search, batchFilter, semesterFilter, statusFilter, sectionFilter, sorting])

  // Queries
  const { data: studentsData, isLoading } = useQuery<PaginatedResponse<StudentRow>>({
    queryKey: ['students', queryString],
    queryFn: () => fetch(`/api/students?${queryString}`).then((r) => r.json()),
  })

  const { data: statsRaw, isLoading: isLoadingStats } = useQuery<{ success: boolean; data: StudentStats }>({
    queryKey: ['students', 'stats'],
    queryFn: () => fetch('/api/students/stats', { cache: 'no-store' }).then((r) => r.json()),
  })
  const stats = statsRaw?.data

  const availableSemesters = useMemo(() => {
    if (!stats?.bySemesterSection) return [1, 2, 3, 4, 5, 6, 7, 8]
    const sems = new Set(stats.bySemesterSection.map(item => item.semester))
    return Array.from(sems).sort((a, b) => a - b)
  }, [stats?.bySemesterSection])

  const { data: studentDetail, isLoading: detailLoading } = useQuery<{
    success: boolean
    data: StudentDetail
  }>({
    queryKey: ['student', selectedStudentId],
    queryFn: () => fetch(`/api/students/${selectedStudentId}`).then((r) => r.json()),
    enabled: !!selectedStudentId,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          departmentId: values.departmentId || csDepartmentId,
          password: values.password || 'student123',
        }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Student created successfully')
        setFormOpen(false)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['students', 'stats'] })
      } else {
        toast.error(data.error || 'Failed to create student')
      }
    },
    onError: () => toast.error('Failed to create student'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: FormValues }) =>
      fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Student updated successfully')
        setFormOpen(false)
        setEditingStudent(null)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['student', editingStudent?.id] })
      } else {
        toast.error(data.error || 'Failed to update student')
      }
    },
    onError: () => toast.error('Failed to update student'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/students/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Student deactivated successfully')
        setDeactivateAlert(null)
        queryClient.invalidateQueries({ queryKey: ['students'] })
        queryClient.invalidateQueries({ queryKey: ['students', 'stats'] })
        setDetailOpen(false)
      } else {
        toast.error(data.error || 'Failed to deactivate student')
      }
    },
    onError: () => toast.error('Failed to deactivate student'),
  })

  // Get CS department ID from students data
  const csDepartmentId = studentsData?.data?.[0]?.department?.id || ''

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      studentId: '',
      departmentId: csDepartmentId,
      currentSemester: 1,
      enrollmentYear: new Date().getFullYear(),
      batch: '',
      program: 'BS',
      gender: '',
      dateOfBirth: '',
      phone: '',
      address: '',
      guardianName: '',
      guardianPhone: '',
      emergencyContact: '',
      profilePicture: '',
      fatherName: '',
      cnic: '',
      mobileNumber: '',
      fatherPhone: '',
      session: '',
      shift: '',
      section: '',
    },
  })

  const sessionVal = form.watch('session')
  useEffect(() => {
    if (sessionVal) {
      const match = sessionVal.match(/\b\d{4}\b/)
      if (match) {
        const year = match[0]
        form.setValue('batch', `Batch-${year}`)
        form.setValue('enrollmentYear', Number(year))
      }
    }
  }, [sessionVal, form])

  const shiftVal = form.watch('shift')
  useEffect(() => {
    if (!shiftVal) {
      form.setValue('section', '')
      return
    }
    const currentSection = form.getValues('section')
    if (shiftVal === 'Morning') {
      if (currentSection !== 'Morning') {
        form.setValue('section', 'Morning')
      }
    } else if (shiftVal === 'Evening') {
      if (currentSection !== 'Evening A' && currentSection !== 'Evening B') {
        form.setValue('section', 'Evening A')
      }
    }
  }, [shiftVal, form])

  const resetForm = useCallback(() => {
    form.reset({
      name: '',
      email: '',
      password: '',
      studentId: '',
      departmentId: '',
      currentSemester: 1,
      enrollmentYear: new Date().getFullYear(),
      batch: '',
      program: 'BS',
      gender: '',
      dateOfBirth: '',
      phone: '',
      address: '',
      guardianName: '',
      guardianPhone: '',
      emergencyContact: '',
      profilePicture: '',
      fatherName: '',
      cnic: '',
      mobileNumber: '',
      fatherPhone: '',
      session: '',
      shift: '',
      section: '',
    })
  }, [form])

  const openCreateForm = useCallback(() => {
    setEditingStudent(null)
    resetForm()
    setFormOpen(true)
  }, [resetForm, form])

  const openEditForm = useCallback(
    async (student: StudentRow) => {
      setEditingStudent(student)
      resetForm()
      setFormOpen(true)
      
      try {
        const res = await fetch(`/api/students/${student.id}`).then((r) => r.json())
        if (res.success && res.data) {
          const detail = res.data
          form.setValue('name', detail.user.name || '')
          form.setValue('email', detail.user.email || '')
          form.setValue('studentId', detail.studentId || '')
          form.setValue('currentSemester', detail.currentSemester || 1)
          form.setValue('program', detail.program || 'BS')
          form.setValue('batch', detail.batch || '')
          form.setValue('gender', detail.gender || '')
          form.setValue('departmentId', detail.departmentId || '')
          form.setValue('enrollmentYear', detail.enrollmentYear || new Date().getFullYear())
          form.setValue('phone', detail.user.phone || '')
          form.setValue('address', detail.address || '')
          form.setValue('guardianName', detail.guardianName || '')
          form.setValue('guardianPhone', detail.guardianPhone || '')
          form.setValue('emergencyContact', detail.emergencyContact || '')
          form.setValue('profilePicture', detail.profilePicture || '')
          form.setValue('fatherName', detail.fatherName || '')
          form.setValue('cnic', detail.cnic || '')
          form.setValue('mobileNumber', detail.mobileNumber || '')
          form.setValue('fatherPhone', detail.fatherPhone || '')
          form.setValue('session', detail.session || '')
          
          const sectionVal = detail.section || ''
          let derivedShift = ''
          if (sectionVal.startsWith('Evening')) {
            derivedShift = 'Evening'
          } else if (sectionVal.startsWith('Morning') || sectionVal === 'Morning') {
            derivedShift = 'Morning'
          }
          form.setValue('shift', derivedShift)
          form.setValue('section', sectionVal)
        }
      } catch (err) {
        console.error('Failed to load student details for editing', err)
      }
    },
    [form, resetForm]
  )

  const openDetail = useCallback((student: StudentRow) => {
    setSelectedStudentId(student.id)
    setDetailOpen(true)
  }, [])

  const onSubmit = useCallback(
    (values: FormValues) => {
      if (editingStudent) {
        updateMutation.mutate({ id: editingStudent.id, values })
      } else {
        createMutation.mutate(values)
      }
    },
    [editingStudent, createMutation, updateMutation]
  )

  // Table columns
  const columns = useMemo<ColumnDef<StudentRow, unknown>[]>(
    () => [
      {
        accessorKey: 'studentId',
        header: 'Student ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue('studentId')}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const name = row.getValue('name') as string
          return (
            <div className="flex items-center gap-2">
              <Avatar className="size-7">
                {row.original.profilePicture && (
                  <AvatarImage src={row.original.profilePicture} alt={name} className="object-cover" />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium truncate max-w-[160px]">{name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs truncate max-w-[180px] block">
            {row.getValue('email')}
          </span>
        ),
      },
      {
        accessorKey: 'batch',
        header: 'Batch',
        cell: ({ row }) => {
          const batch = row.getValue('batch') as string | null
          return batch ? <Badge variant="secondary">{batch.replace('Batch-', '')}</Badge> : <span className="text-muted-foreground">—</span>
        },
      },
      {
        accessorKey: 'currentSemester',
        header: 'Sem',
        cell: ({ row }) => <span>{row.getValue('currentSemester')}</span>,
      },
      {
        accessorKey: 'gpa',
        header: 'GPA',
        cell: ({ row }) => {
          const gpa = row.getValue('gpa') as number | null
          if (gpa === null) return <span className="text-muted-foreground">—</span>
          const colorClass =
            gpa >= 3.0
              ? 'text-emerald-600 dark:text-emerald-400'
              : gpa >= 2.0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          return <span className={`font-semibold ${colorClass}`}>{gpa.toFixed(2)}</span>
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string
          if (status === 'ACTIVE') {
            return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Active</Badge>
          }
          if (status === 'SUSPENDED') {
            return <Badge variant="destructive">Suspended</Badge>
          }
          return <Badge variant="secondary">Graduated</Badge>
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const student = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(student) }}>
                  <Eye className="size-4" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditForm(student) }}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                {isAdmin && student.status === 'ACTIVE' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => { e.stopPropagation(); setDeactivateAlert(student.id) }}
                    >
                      <UserX className="size-4" /> Deactivate
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [openDetail, openEditForm, isAdmin]
  )

  const students = studentsData?.data || []
  const pagination = studentsData?.pagination

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student records, enrollments, and academic profiles"
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button onClick={openCreateForm} size="sm">
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Add Student</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="size-4" />
                  <span className="hidden sm:inline">Import CSV</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {selectedGroup === null ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3.5">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base font-bold tracking-tight text-foreground">Academic Classes</h2>
                <p className="text-[11px] text-muted-foreground">Select a class section to view and manage its student directory</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={cardSemesterFilter} onValueChange={setCardSemesterFilter}>
                  <SelectTrigger size="sm" className="w-[125px]">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {availableSemesters.map((sem) => (
                      <SelectItem key={sem} value={String(sem)}>Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={cardShiftFilter} onValueChange={setCardShiftFilter}>
                  <SelectTrigger size="sm" className="w-[110px]">
                    <SelectValue placeholder="Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={cardSectionFilter} onValueChange={setCardSectionFilter}>
                  <SelectTrigger size="sm" className="w-[110px]">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
              {isLoadingStats ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="animate-pulse border shadow-sm h-[112px] py-0">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between w-full">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-20" />
                      <div className="flex items-center justify-between w-full">
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : stats?.bySemesterSection && stats.bySemesterSection.length > 0 ? (
                (() => {
                  const filtered = [...stats.bySemesterSection]
                    .filter((item) => {
                      if (cardSemesterFilter !== 'all' && String(item.semester) !== cardSemesterFilter) {
                        return false
                      }
                      if (cardShiftFilter !== 'all' && item.shift !== cardShiftFilter) {
                        return false
                      }
                      if (cardSectionFilter !== 'all') {
                        const sec = item.section || ''
                        const isMatch = sec.endsWith(` ${cardSectionFilter}`) || sec === cardSectionFilter
                        if (!isMatch) return false
                      }
                      return true
                    })
                    .sort((a, b) => a.semester - b.semester || a.section.localeCompare(b.section))

                  if (filtered.length === 0) {
                    return (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border border-dashed rounded-xl bg-muted/20">
                        <p className="text-sm font-bold text-muted-foreground">No classes found</p>
                      </div>
                    )
                  }
                  const getProgramName = (sec: string) => {
                    const s = sec.toUpperCase()
                    if (s.includes('BSCS') || s.startsWith('CS')) return 'BS CS'
                    if (s.includes('BSSE') || s.startsWith('SE')) return 'BS SE'
                    if (s.includes('BSIT') || s.startsWith('IT')) return 'BS IT'
                    return 'BS CS'
                  }

                  const getCleanSection = (sec: string) => {
                    if (!sec) return 'TBD'
                    const parts = sec.trim().split(/\s+/)
                    const lastPart = parts[parts.length - 1]
                    const match = lastPart.match(/[A-Z]$/i)
                    if (match) return match[0].toUpperCase()
                    return lastPart
                  }

                  return filtered.map((item) => {
                    const isAssigned = item.room && item.room !== 'N/A' && item.room !== 'Room: TBD'
                    return (
                      <Card
                        key={`${item.semester}-${item.section}`}
                        className="group relative cursor-pointer overflow-hidden border border-slate-200/85 dark:border-slate-800 border-t-[3px] border-t-emerald-600 shadow-[0_2px_8px_rgba(0,0,0,0.02)] bg-white dark:bg-slate-950 rounded-xl hover:shadow-[0_6px_16px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
                        onClick={() => {
                          setSelectedGroup({ semester: item.semester, section: item.section })
                          setSemesterFilter(String(item.semester))
                          setSectionFilter(item.section)
                          setPage(1)
                        }}
                      >
                        <CardContent className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                          {/* Top Row: Program Badge & Options */}
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-900/20 bg-emerald-50/40 dark:bg-emerald-950/15 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold tracking-wide">
                              <span className="size-1 rounded-full bg-emerald-500 shrink-0" />
                              <span>{getProgramName(item.section)}</span>
                            </div>

                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" className="h-5 w-5 p-0 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 flex items-center justify-center">
                                    <MoreVertical className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setAssignRoomClass({
                                      semester: item.semester,
                                      section: item.section,
                                      room: item.room,
                                      floor: item.floor
                                    });
                                  }}>
                                    Assign Room/Floor
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {/* Middle: Semester Name */}
                          <div>
                            <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                              Semester {item.semester}
                            </h3>
                          </div>

                          {/* Middle Box: Shift & Section */}
                          <div className="grid grid-cols-2 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/5 overflow-hidden divide-x divide-slate-200/70 dark:divide-slate-800">
                            <div className="px-2.5 py-1.5 flex flex-col justify-center">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">Shift</p>
                              <p className={cn(
                                "font-bold text-xs mt-1 leading-none",
                                item.shift?.toLowerCase() === 'evening' 
                                  ? 'text-amber-600 dark:text-amber-400' 
                                  : 'text-emerald-600 dark:text-emerald-400'
                              )}>
                                {item.shift ? (item.shift.charAt(0).toUpperCase() + item.shift.slice(1).toLowerCase()) : 'Morning'}
                              </p>
                            </div>
                            <div className="px-2.5 py-1.5 flex flex-col justify-center">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">Section</p>
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-1 leading-none">
                                {getCleanSection(item.section)}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Room Section */}
                          <div className="group/room bg-slate-50/40 hover:bg-slate-50 dark:bg-slate-900/20 dark:hover:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-lg p-2 flex items-center justify-between transition-all duration-200">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                                <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">Room</span>
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-1 truncate">
                                  {isAssigned ? `Room ${item.room}` : 'Not Assigned'}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {isAssigned 
                                    ? (item.floor !== null ? `Floor ${item.floor}` : 'Ground Floor') 
                                    : 'Room allocation pending'
                                  }
                                </span>
                              </div>
                            </div>
                            <div className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 group-hover/room:border-emerald-500/30 group-hover/room:text-emerald-600 transition-all duration-200 flex items-center justify-center shrink-0">
                              <ArrowRight className="h-3.5 w-3.5 group-hover/room:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                })()
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20">
                  <Users className="size-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No class groups found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedGroup(null)
                setSemesterFilter('all')
                setSectionFilter('all')
                setPage(1)
              }}
              className="h-8 gap-1.5"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Classes</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Semester {selectedGroup.semester} - Section {selectedGroup.section}
              </h2>
              <p className="text-xs text-muted-foreground">
                Showing student records for Semester {selectedGroup.semester}, Section {selectedGroup.section}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, email..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger size="sm" className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="GRADUATED">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={students}
                isLoading={isLoading}
                pageCount={pagination?.totalPages}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(p, s) => {
                  setPage(p + 1)
                  setPageSize(s)
                }}
                onSortingChange={setSorting}
                sorting={sorting}
                manualPagination
                onRowClick={openDetail}
                emptyMessage="No students found matching your criteria."
                emptyIcon={<GraduationCap className="size-10 text-muted-foreground/40" />}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student Form Dialog / Sheet */}
      {isMobile ? (
        <StudentFormSheet
          open={formOpen}
          onOpenChange={setFormOpen}
          editingStudent={editingStudent}
          form={form}
          onSubmit={onSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      ) : (
        <StudentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editingStudent={editingStudent}
          form={form}
          onSubmit={onSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onAiOpen={() => setAiOpen(true)}
        />
      )}

      {/* Student Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          {detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : studentDetail?.data ? (
            <StudentDetailPanel student={studentDetail.data} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Student not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Deactivate Alert */}
      <AlertDialog open={!!deactivateAlert} onOpenChange={() => setDeactivateAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the student&apos;s account and mark them as inactive. The student will no longer be able to log in. This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deactivateAlert && deleteMutation.mutate(deactivateAlert)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityType={'students' as ImportEntityType}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['students'] })
          queryClient.invalidateQueries({ queryKey: ['students', 'stats'] })
        }}
      />

      {/* AI Smart Entry */}
      <AiInput
        open={aiOpen}
        onOpenChange={setAiOpen}
        entityType="student"
        onParsed={(data) => {
          if (data.name) form.setValue('name', data.name)
          if (data.email) form.setValue('email', data.email)
          if (data.studentId) form.setValue('studentId', data.studentId)
          if (data.gender) form.setValue('gender', data.gender)
          if (data.batch) form.setValue('batch', data.batch)
          if (data.currentSemester) form.setValue('currentSemester', Number(data.currentSemester))
          if (data.enrollmentYear) form.setValue('enrollmentYear', Number(data.enrollmentYear))
          if (data.program) form.setValue('program', data.program)
          if (data.guardianName) form.setValue('guardianName', data.guardianName)
          if (data.guardianPhone) form.setValue('guardianPhone', data.guardianPhone)
          if (data.phone) form.setValue('phone', data.phone)
        }}
      />

      {/* Assign Room & Floor Dialog */}
      <Dialog open={!!assignRoomClass} onOpenChange={(open) => !open && setAssignRoomClass(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-primary animate-bounce-slow" />
              Assign Room & Floor
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold">
              Assign a physical classroom and floor to the students of{' '}
              <span className="font-black text-foreground">
                Sem {assignRoomClass?.semester} - Section {assignRoomClass?.section}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground">Select Room from Database</label>
              <Select
                value={selectedRoomId}
                onValueChange={(val) => {
                  setSelectedRoomId(val)
                  if (val !== 'custom') {
                    const r = rooms.find((x) => x.id === val)
                    if (r) {
                      setCustomRoomName(r.name)
                      setCustomFloor(String(r.floor !== null && r.floor !== undefined ? r.floor : ''))
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full font-bold">
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom" className="font-extrabold text-primary">
                    Custom Room / Enter Manually
                  </SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="font-bold">
                      {r.name} {r.building ? `(${r.building})` : ''} - Flr {r.floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-muted-foreground">Room Name</label>
                <Input
                  value={customRoomName}
                  onChange={(e) => setCustomRoomName(e.target.value)}
                  placeholder="e.g. Lab-301"
                  disabled={selectedRoomId !== 'custom'}
                  className="font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-muted-foreground">Floor Number</label>
                <Input
                  type="number"
                  value={customFloor}
                  onChange={(e) => setCustomFloor(e.target.value)}
                  placeholder="e.g. 3"
                  disabled={selectedRoomId !== 'custom'}
                  className="font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="font-bold"
              onClick={() => setAssignRoomClass(null)}
              disabled={isSavingRoom}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="font-bold"
              onClick={handleSaveRoom}
              disabled={isSavingRoom}
            >
              {isSavingRoom && <Loader2 className="size-4 animate-spin mr-2" />}
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-md border border-slate-200/80 dark:border-slate-800/80 py-0 ${accent ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent' : 'bg-card'}`}>
      <CardContent className="p-3.5 flex items-center gap-3.5">
        <div className={`flex size-10 items-center justify-center rounded-xl transition-colors ${accent ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
          {icon}
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-xl font-black tracking-tight ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StudentFormDialog({
  open,
  onOpenChange,
  editingStudent,
  form,
  onSubmit,
  isSubmitting,
  onAiOpen,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingStudent: StudentRow | null
  form: UseFormReturn<FormValues>
  onSubmit: (values: FormValues) => void
  isSubmitting: boolean
  onAiOpen?: () => void
}) {
  const [uploading, setUploading] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 md:p-8 pb-0 shrink-0 pr-16">
          <div className="flex items-center justify-between">
            <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            {!editingStudent && onAiOpen && (
              <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30" onClick={onAiOpen}>
                <Sparkles className="size-3.5" />
                AI Assist
              </Button>
            )}
          </div>
          <DialogDescription>
            {editingStudent ? 'Update student information below.' : 'Fill in the details to create a new student account.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-4">
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+92 300 1234567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Mobile Number</FormLabel>
                    <FormControl><Input placeholder="+92 300 1234567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cnic" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNIC Number</FormLabel>
                    <FormControl><Input placeholder="37405-1234567-8" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="profilePicture" render={({ field }) => {
                  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    setUploading(true)
                    const formData = new FormData()
                    formData.append('file', file)
                    
                    try {
                      const res = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                      })
                      if (!res.ok) throw new Error('Upload failed')
                      const data = await res.json()
                      field.onChange(data.url)
                      toast.success('Profile picture uploaded successfully')
                    } catch (err) {
                      console.error(err)
                      toast.error('Failed to upload image')
                    } finally {
                      setUploading(false)
                    }
                  }

                  return (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Profile Picture</FormLabel>
                      <FormControl>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 border rounded-lg bg-muted/20">
                          <Avatar className="size-16 border">
                            {field.value ? (
                              <AvatarImage src={field.value} alt="Preview" className="object-cover" />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                              {form.getValues('name') ? form.getValues('name').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1.5">
                            <Input
                              type="file"
                              accept="image/*"
                              className="max-w-xs cursor-pointer text-xs"
                              onChange={handleFileChange}
                              disabled={uploading}
                            />
                            <p className="text-xs text-muted-foreground">
                              {uploading ? 'Uploading picture...' : 'PNG, JPG or WEBP. Max 5MB.'}
                            </p>
                          </div>
                          {field.value && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => field.onChange('')}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }} />
              </div>
            </div>

            <Separator />

            {/* Academic Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Academic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                <FormField control={form.control} name="studentId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student ID *</FormLabel>
                    <FormControl><Input placeholder="CS-2025-016" {...field} disabled={!!editingStudent} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="program" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <Select value={field.value || 'BS'} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="BS">BS</SelectItem>
                        <SelectItem value="MS">MS</SelectItem>
                        <SelectItem value="PhD">PhD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="session" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session</FormLabel>
                    <FormControl><Input placeholder="e.g. 2022-2026" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="currentSemester" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Semester</FormLabel>
                    <Select value={String(field.value || '1')} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="enrollmentYear" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enrollment Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="shift" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift *</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Morning">Morning</SelectItem>
                        <SelectItem value="Evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="section" render={({ field }) => {
                  const shift = form.watch('shift')
                  return (
                    <FormItem>
                      <FormLabel>Section *</FormLabel>
                      <Select 
                        value={field.value || ''} 
                        onValueChange={field.onChange}
                        disabled={!shift}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={shift ? "Select section" : "Select shift first"} />
                          </SelectTrigger>
                        </FormControl>
                         <SelectContent>
                          {shift === 'Morning' && (
                            <>
                              <SelectItem value="Morning A">Morning A</SelectItem>
                              <SelectItem value="Morning B">Morning B</SelectItem>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                            </>
                          )}
                          {shift === 'Evening' && (
                            <>
                              <SelectItem value="Evening A">Evening A</SelectItem>
                              <SelectItem value="Evening B">Evening B</SelectItem>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )
                }} />
              </div>
            </div>

            <Separator />

            {/* Guardian Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Guardian Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                <FormField control={form.control} name="fatherName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father Name</FormLabel>
                    <FormControl><Input placeholder="Father's full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fatherPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father's Mobile Number</FormLabel>
                    <FormControl><Input placeholder="+92 300 1234567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="emergencyContact" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Emergency Contact</FormLabel>
                    <FormControl><Input placeholder="Emergency contact number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="Full address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <Separator />

            {/* Account Credentials */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Account Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className={editingStudent ? "sm:col-span-2" : ""}>
                    <FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" placeholder="student@csdept.edu" {...field} disabled={!!editingStudent} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {!editingStudent && (
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl><Input type="password" placeholder="Min. 6 characters" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {editingStudent ? 'Update Student' : 'Create Student'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StudentFormSheet({
  open,
  onOpenChange,
  editingStudent,
  form,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingStudent: StudentRow | null
  form: UseFormReturn<FormValues>
  onSubmit: (values: FormValues) => void
  isSubmitting: boolean
}) {
  const [uploading, setUploading] = useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader>
          <SheetTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</SheetTitle>
          <SheetDescription>
            {editingStudent ? 'Update student information below.' : 'Fill in the details to create a new student account.'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-4 px-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input placeholder="+92 300 1234567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Mobile Number</FormLabel>
                      <FormControl><Input placeholder="+92 300 1234567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cnic" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNIC Number</FormLabel>
                      <FormControl><Input placeholder="37405-1234567-8" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="profilePicture" render={({ field }) => {
                    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      
                      setUploading(true)
                      const formData = new FormData()
                      formData.append('file', file)
                      
                      try {
                        const res = await fetch('/api/upload', {
                          method: 'POST',
                          body: formData,
                        })
                        if (!res.ok) throw new Error('Upload failed')
                        const data = await res.json()
                        field.onChange(data.url)
                        toast.success('Profile picture uploaded successfully')
                      } catch (err) {
                        console.error(err)
                        toast.error('Failed to upload image')
                      } finally {
                        setUploading(false)
                      }
                    }

                    return (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Profile Picture</FormLabel>
                        <FormControl>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 border rounded-lg bg-muted/20">
                            <Avatar className="size-16 border">
                              {field.value ? (
                                <AvatarImage src={field.value} alt="Preview" className="object-cover" />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                                {form.getValues('name') ? form.getValues('name').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1.5">
                              <Input
                                type="file"
                                accept="image/*"
                                className="max-w-xs cursor-pointer text-xs"
                                onChange={handleFileChange}
                                disabled={uploading}
                              />
                              <p className="text-xs text-muted-foreground">
                                {uploading ? 'Uploading picture...' : 'PNG, JPG or WEBP. Max 5MB.'}
                              </p>
                            </div>
                            {field.value && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => field.onChange('')}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }} />
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">Academic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                  <FormField control={form.control} name="studentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student ID *</FormLabel>
                      <FormControl><Input placeholder="CS-2025-016" {...field} disabled={!!editingStudent} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="program" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <Select value={field.value || 'BS'} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="BS">BS</SelectItem>
                          <SelectItem value="MS">MS</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="session" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session</FormLabel>
                      <FormControl><Input placeholder="e.g. 2022-2026" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currentSemester" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Semester</FormLabel>
                      <Select value={String(field.value || '1')} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="enrollmentYear" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enrollment Year</FormLabel>
                      <FormControl><Input type="number" placeholder="2025" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="shift" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift *</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Evening">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="section" render={({ field }) => {
                    const shift = form.watch('shift')
                    return (
                      <FormItem>
                        <FormLabel>Section *</FormLabel>
                        <Select 
                          value={field.value || ''} 
                          onValueChange={field.onChange}
                          disabled={!shift}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={shift ? "Select section" : "Select shift first"} />
                            </SelectTrigger>
                          </FormControl>
                           <SelectContent>
                            {shift === 'Morning' && (
                              <>
                                <SelectItem value="Morning A">Morning A</SelectItem>
                                <SelectItem value="Morning B">Morning B</SelectItem>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                              </>
                            )}
                            {shift === 'Evening' && (
                              <>
                                <SelectItem value="Evening A">Evening A</SelectItem>
                                <SelectItem value="Evening B">Evening B</SelectItem>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )
                  }} />
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">Guardian Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                  <FormField control={form.control} name="fatherName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father Name</FormLabel>
                      <FormControl><Input placeholder="Father's full name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fatherPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Mobile Number</FormLabel>
                      <FormControl><Input placeholder="+92 300 1234567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="emergencyContact" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl><Input placeholder="Emergency contact number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input placeholder="Full address" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
              <Separator />
              {/* Account Credentials */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Account Credentials</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className={editingStudent ? "sm:col-span-2" : ""}>
                      <FormLabel>Email *</FormLabel>
                      <FormControl><Input type="email" placeholder="student@csdept.edu" {...field} disabled={!!editingStudent} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {!editingStudent && (
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl><Input type="password" placeholder="Min. 6 characters" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingStudent ? 'Update Student' : 'Create Student'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function StudentDetailPanel({ student }: { student: StudentDetail }) {
  const initials = student.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const statusBadge =
    student.status === 'ACTIVE' ? (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Active</Badge>
    ) : student.status === 'SUSPENDED' ? (
      <Badge variant="destructive">Suspended</Badge>
    ) : (
      <Badge variant="secondary">Graduated</Badge>
    )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 space-y-3 shrink-0">
        <SheetHeader>
          <SheetTitle className="sr-only">Student Details</SheetTitle>
          <SheetDescription className="sr-only">View student information, enrollments, attendance, and results</SheetDescription>
        </SheetHeader>
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            {student.profilePicture && (
              <AvatarImage src={student.profilePicture} alt={student.user.name} className="object-cover" />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold truncate">{student.user.name}</h2>
              {statusBadge}
            </div>
            <p className="text-sm text-muted-foreground font-mono">{student.studentId}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {student.department.name} &middot; {student.program} &middot; Batch {student.batch?.replace('Batch-', '') || 'N/A'}
              {student.section && ` &middot; Section: ${student.section}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="flex-1 min-h-0">
        <div className="px-6 pt-2 shrink-0">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1"><Users className="size-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Profile</span></TabsTrigger>
            <TabsTrigger value="enrollments" className="flex-1"><BookOpen className="size-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Enrollments</span></TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1"><ClipboardCheck className="size-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Attendance</span></TabsTrigger>
            <TabsTrigger value="results" className="flex-1"><BarChart3 className="size-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Results</span></TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 pb-6">
            <TabsContent value="profile" className="mt-4">
              <ProfileTab student={student} />
            </TabsContent>
            <TabsContent value="enrollments" className="mt-4">
              <EnrollmentsTab enrollments={student.enrollments} />
            </TabsContent>
            <TabsContent value="attendance" className="mt-4">
              <AttendanceTab attendance={student.attendanceSummary} />
            </TabsContent>
            <TabsContent value="results" className="mt-4">
              <ResultsTab results={student.results} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

function ProfileTab({ student }: { student: StudentDetail }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">GPA</p>
          <p className={`text-lg font-bold ${student.gpa && student.gpa >= 3.0 ? 'text-emerald-600 dark:text-emerald-400' : student.gpa && student.gpa >= 2.0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
            {student.gpa?.toFixed(2) || 'N/A'}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Semester</p>
          <p className="text-lg font-bold">{student.currentSemester}</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Credits</p>
          <p className="text-lg font-bold">{student.totalCredits}</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-4">
        <Section title="Contact Information">
          <InfoRow icon={<Mail className="size-4" />} label="Email" value={student.user.email} />
          <InfoRow icon={<Phone className="size-4" />} label="Phone" value={student.user.phone || 'Not provided'} />
          {student.mobileNumber && <InfoRow icon={<Phone className="size-4" />} label="Student Mobile" value={student.mobileNumber} />}
          <InfoRow icon={<MapPin className="size-4" />} label="Address" value={student.address || 'Not provided'} />
        </Section>

        <Section title="Academic Details">
          <InfoRow icon={<GraduationCap className="size-4" />} label="Program" value={`${student.program} ${student.department.name}`} />
          <InfoRow icon={<Calendar className="size-4" />} label="Session" value={student.session || 'N/A'} />
          <InfoRow icon={<Calendar className="size-4" />} label="Batch" value={student.batch?.replace('Batch-', '') || 'N/A'} />
          <InfoRow icon={<Shield className="size-4" />} label="Student ID" value={student.studentId} />
          <InfoRow icon={<Calendar className="size-4" />} label="Enrollment Year" value={String(student.enrollmentYear)} />
          {student.section && <InfoRow icon={<Users className="size-4" />} label="Section" value={student.section} />}
        </Section>

        <Section title="Personal Details">
          <InfoRow icon={<Users className="size-4" />} label="Gender" value={student.gender || 'Not specified'} />
          <InfoRow icon={<Calendar className="size-4" />} label="Date of Birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'Not specified'} />
          {student.cnic && <InfoRow icon={<Shield className="size-4" />} label="CNIC Number" value={student.cnic} />}
        </Section>

        <Section title="Guardian & Parent Information">
          {student.fatherName && <InfoRow icon={<Users className="size-4" />} label="Father Name" value={student.fatherName} />}
          {student.fatherPhone && <InfoRow icon={<Phone className="size-4" />} label="Father Phone" value={student.fatherPhone} />}
          <InfoRow icon={<Phone className="size-4" />} label="Emergency Contact" value={student.emergencyContact || 'Not provided'} />
        </Section>
      </div>
    </div>
  )
}

function EnrollmentsTab({ enrollments }: { enrollments: StudentDetail['enrollments'] }) {
  if (!enrollments.length) {
    return <EmptyTab message="No enrollments found." />
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead className="text-center">Credits</TableHead>
            <TableHead className="text-center">Section</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{e.course.code}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{e.course.name}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm">{e.semester.name}</p>
                <p className="text-xs text-muted-foreground">{e.semester.year}</p>
              </TableCell>
              <TableCell className="text-center">{e.course.creditHours}</TableCell>
              <TableCell className="text-center">{e.section}</TableCell>
              <TableCell className="text-center">
                <Badge variant={e.status === 'ENROLLED' ? 'default' : 'secondary'} className="text-xs">
                  {e.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function AttendanceTab({ attendance }: { attendance: StudentDetail['attendanceSummary'] }) {
  if (!attendance.length) {
    return <EmptyTab message="No attendance records found." />
  }

  return (
    <div className="space-y-3">
      {attendance.map((a) => (
        <div key={a.courseId} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{a.courseCode} — {a.courseName}</p>
              <p className="text-xs text-muted-foreground">
                {a.present + a.late} / {a.total} classes attended
              </p>
            </div>
            <span
              className={`text-sm font-bold ${
                a.percentage >= 85
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : a.percentage >= 75
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {a.percentage}%
            </span>
          </div>
          <Progress
            value={a.percentage}
            className="h-2"
          />
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Present: {a.present}</span>
            <span>Late: {a.late}</span>
            <span>Excused: {a.excused}</span>
            <span>Absent: {a.total - a.present - a.late - a.excused}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ResultsTab({ results }: { results: StudentDetail['results'] }) {
  if (!results.length) {
    return <EmptyTab message="No results found." />
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead className="text-center">Marks</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-center">GPA</TableHead>
            <TableHead>Semester</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{r.course.code}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{r.course.name}</p>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm">
                  {r.totalMarks !== null ? r.totalMarks.toFixed(1) : 'N/A'}
                  {r.percentage !== null && <span className="text-xs text-muted-foreground ml-1">({r.percentage.toFixed(1)}%)</span>}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {r.grade ? (
                  <Badge
                    variant="outline"
                    className={
                      r.grade === 'A' || r.grade === 'A_MINUS'
                        ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400'
                        : r.grade === 'F'
                          ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400'
                          : ''
                    }
                  >
                    {formatGrade(r.grade)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <span className={`text-sm font-semibold ${r.gradePoint && r.gradePoint >= 3.0 ? 'text-emerald-600 dark:text-emerald-400' : r.gradePoint && r.gradePoint < 2.0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {r.gradePoint?.toFixed(1) || '—'}
                </span>
              </TableCell>
              <TableCell>
                <p className="text-sm">{r.semester.name}</p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ==================== Utility Components ====================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Inbox className="size-5 text-muted-foreground/60" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function formatGrade(grade: string): string {
  return grade.replace(/_/g, '-')
}
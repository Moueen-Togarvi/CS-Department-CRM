'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table'
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  Users,
  Clock,
  BarChart3,
  FileText,
  UserPlus,
  Check,
  Loader2,
  X,
  Upload,
  LayoutGrid,
  List,
  AlertTriangle,
  UserCheck,
  GraduationCap,
  ArrowRight,
  User,
} from 'lucide-react'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/shared/page-header'
import { CsvImportDialog } from '@/components/shared/csv-import-dialog'
import type { ImportEntityType } from '@/components/shared/csv-import-dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  createCourseSchema,
  updateCourseSchema,
  COURSE_TYPES,
  type CreateCourseInput,
  type UpdateCourseInput,
} from '@/lib/validators/course'

// ==================== TYPES ====================

interface CourseInstructor {
  id: string
  facultyId: string
  name: string
}

interface CourseListItem {
  id: string
  code: string
  name: string
  creditHours: number
  labCreditHours: number
  courseType: string
  semesterOffered: number | null
  description: string | null
  objectives: string | null
  prerequisites: string | string[]
  isActive: boolean
  instructor: CourseInstructor | null
  department: { id: string; name: string; code: string }
  enrollmentCount: number
  createdAt: string
}

interface CourseEnrollment {
  id: string
  section: string
  status: string
  enrollmentDate: string
  student: {
    id: string
    studentId: string
    name: string
    email: string
  }
  semester: { id: string; name: string; isCurrent: boolean }
  result: { grade: string | null; percentage: number | null; isLocked: boolean } | null
}

interface CourseDetail extends Omit<CourseListItem, 'enrollmentCount'> {
  instructor: CourseInstructor & { designation: string; email: string; phone: string | null } | null
  enrollments: CourseEnrollment[]
  documents: {
    id: string
    title: string
    category: string
    fileType: string | null
    fileSize: number | null
    createdAt: string
    uploadedByUser: { name: string }
  }[]
  resultsStats: {
    totalGraded: number
    gradeDistribution: Record<string, number>
    avgPercentage: number | null
  }
}

interface CourseStats {
  total: number
  active: number
  byType: Record<string, number>
  activeEnrollments: number
}

interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface ApiOk<T> {
  success: boolean
  data: T
  message?: string
}

interface DepartmentOption {
  id: string
  name: string
  code: string
}

interface FacultyOption {
  id: string
  facultyId: string
  name: string
}

interface SemesterOption {
  id: string
  name: string
  isCurrent: boolean
}

interface StudentOption {
  id: string
  studentId: string
  name: string
  email: string
  currentSemester: number
}

// ==================== HELPERS ====================

function courseTypeColor(t: string) {
  switch (t) {
    case 'THEORY':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'LAB':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    case 'PROJECT':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
    case 'SEMINAR':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

function gradeColor(grade: string | null) {
  if (!grade) return 'bg-secondary text-secondary-foreground'
  if (grade === 'A' || grade === 'A_MINUS') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
  if (grade === 'B_PLUS' || grade === 'B' || grade === 'B_MINUS') return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
  if (grade === 'C_PLUS' || grade === 'C' || grade === 'C_MINUS') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  if (grade === 'D_PLUS' || grade === 'D') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
  if (grade === 'F') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  return 'bg-secondary text-secondary-foreground'
}

function formatGrade(grade: string | null) {
  if (!grade) return '—'
  return grade.replace(/_/g, '-')
}

// ==================== QUERIES ====================

function useDepartments() {
  return useQuery<DepartmentOption[]>({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await fetch('/api/departments')
      if (!res.ok) throw new Error('Failed to fetch departments')
      const json: { success: boolean; data: DepartmentOption[] } = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useFacultyList() {
  return useQuery<FacultyOption[]>({
    queryKey: ['faculty-options'],
    queryFn: async () => {
      const res = await fetch('/api/faculty?limit=100')
      if (!res.ok) throw new Error('Failed to fetch faculty')
      const json: PaginatedResponse<{
        id: string
        facultyId: string
        user: { name: string }
      }> = await res.json()
      return json.data.map((f) => ({
        id: f.id,
        facultyId: f.facultyId,
        name: f.user.name,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useSemesters() {
  return useQuery<SemesterOption[]>({
    queryKey: ['semesters-list'],
    queryFn: async () => {
      const res = await fetch('/api/departments')
      if (!res.ok) throw new Error('Failed to fetch semesters')
      // Fallback: we need a semesters API, but use a direct fetch approach
      return []
    },
    staleTime: 5 * 60 * 1000,
    enabled: false,
  })
}

// ==================== MAIN COMPONENT ====================

export function CourseModule() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [courseTypeFilter, setCourseTypeFilter] = useState<string>('_all')
  const [creditFilter, setCreditFilter] = useState<string>('_all')
  const [semesterFilter, setSemesterFilter] = useState<string>('_all')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'code', desc: false }])
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Dialog / Sheet
  const [formOpen, setFormOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseListItem | null>(null)
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CourseListItem | null>(null)

  // Enroll dialog
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [enrollCourseId, setEnrollCourseId] = useState<string | null>(null)
  const [enrollCourseSemesterOffered, setEnrollCourseSemesterOffered] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  // Build query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '20')
    if (search) params.set('search', search)
    if (courseTypeFilter !== '_all') params.set('courseType', courseTypeFilter)
    if (creditFilter !== '_all') params.set('creditHours', creditFilter)
    if (semesterFilter !== '_all') params.set('semesterOffered', semesterFilter)
    return params.toString()
  }, [page, search, courseTypeFilter, creditFilter, semesterFilter])

  // Data queries
  const { data: courseData, isLoading } = useQuery<PaginatedResponse<CourseListItem>>({
    queryKey: ['courses', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/courses?${queryString}`)
      if (!res.ok) throw new Error('Failed to fetch courses')
      return res.json()
    },
    placeholderData: keepPreviousData,
  })

  const { data: stats } = useQuery<ApiOk<CourseStats>>({
    queryKey: ['course-stats'],
    queryFn: async () => {
      const res = await fetch('/api/courses/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  const { data: detailData, isLoading: detailLoading } = useQuery<ApiOk<CourseDetail>>({
    queryKey: ['course-detail', detailCourseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${detailCourseId}`)
      if (!res.ok) throw new Error('Failed to fetch course detail')
      return res.json()
    },
    enabled: !!detailCourseId,
  })

  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery<ApiOk<{
    enrollments: CourseEnrollment[]
    semester: { id: string; name: string } | null
  }>>({
    queryKey: ['course-enrollments', enrollCourseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${enrollCourseId}/enrollments`)
      if (!res.ok) throw new Error('Failed to fetch enrollments')
      return res.json()
    },
    enabled: !!enrollCourseId,
  })

  const { data: departments } = useDepartments()
  const { data: facultyList } = useFacultyList()

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: CreateCourseInput) => {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create course')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course-stats'] })
      toast.success('Course created successfully')
      setFormOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UpdateCourseInput }) => {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update course')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course-stats'] })
      if (detailCourseId) queryClient.invalidateQueries({ queryKey: ['course-detail', detailCourseId] })
      toast.success('Course updated successfully')
      setFormOpen(false)
      setEditingCourse(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete course')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course-stats'] })
      toast.success('Course deleted successfully')
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const enrollMutation = useMutation({
    mutationFn: async ({ courseId, studentIds, semesterId, section }: {
      courseId: string
      studentIds: string[]
      semesterId: string
      section: string
    }) => {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds, semesterId, section }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to enroll students')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course-enrollments'] })
      if (detailCourseId) queryClient.invalidateQueries({ queryKey: ['course-detail', detailCourseId] })
      toast.success('Students enrolled successfully')
      setEnrollDialogOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  // Table setup
  const courseList = courseData?.data ?? []
  const pagination = courseData?.pagination

  const columns = useMemo<ColumnDef<CourseListItem>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        size: 100,
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-sm">{row.original.code}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Course Name',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium truncate">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.department.name}</p>
          </div>
        ),
      },
      {
        id: 'credits',
        header: 'Credits',
        size: 90,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="text-sm">
              <span className="font-semibold">{c.creditHours}</span>
              {c.labCreditHours > 0 && (
                <span className="text-muted-foreground">+{c.labCreditHours}L</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'courseType',
        header: 'Type',
        size: 100,
        cell: ({ row }) => (
          <Badge variant="secondary" className={courseTypeColor(row.original.courseType)}>
            {row.original.courseType}
          </Badge>
        ),
      },
      {
        accessorKey: 'instructor',
        header: 'Instructor',
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.instructor ? row.original.instructor.name : (
              <span className="text-muted-foreground italic">Not assigned</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: 'enrollmentCount',
        header: 'Enrolled',
        size: 90,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-semibold">
            {row.original.enrollmentCount}
          </Badge>
        ),
      },
      {
        id: 'actions',
        size: 50,
        cell: ({ row }) => {
          const c = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailCourseId(c.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {user?.role === 'ADMIN' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingCourse(c)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [user?.role]
  )

  const table = useReactTable({
    data: courseList,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? 0,
  })

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Courses"
        description="Manage course catalog, syllabi, and enrollment"
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setEditingCourse(null)
                  setFormOpen(true)
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Course
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import CSV</span>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Stats Cards */}
      {stats?.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.data.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Courses</p>
          </Card>
          {Object.entries(stats.data.byType).map(([key, val]) => (
            <Card key={key} className="p-4">
              <div className="text-2xl font-bold">{val}</div>
              <p className="text-xs text-muted-foreground mt-1">{key}</p>
            </Card>
          ))}
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.data.activeEnrollments}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrollments</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={courseTypeFilter}
            onValueChange={(v) => {
              setCourseTypeFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Types</SelectItem>
              {COURSE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={creditFilter}
            onValueChange={(v) => {
              setCreditFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Credits" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Credits</SelectItem>
              <SelectItem value="1">1 Credit</SelectItem>
              <SelectItem value="2">2 Credits</SelectItem>
              <SelectItem value="3">3 Credits</SelectItem>
              <SelectItem value="4">4 Credits</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={semesterFilter}
            onValueChange={(v) => {
              setSemesterFilter(v)
              setPage(1)
              if (v !== '_all') {
                setViewMode('cards')
              } else {
                setViewMode('table')
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Semester" />
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
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50 self-end sm:self-auto shrink-0">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
              title="Table View"
              type="button"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('cards')}
              title="Cards View"
              type="button"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Course List (Table or Cards) */}
      {viewMode === 'cards' ? (
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="p-3.5 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5.5 w-16" />
                    <Skeleton className="h-5.5 w-12" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Separator />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-8.5 w-full" />
                </Card>
              ))}
            </div>
          ) : courseList.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <BookOpen className="h-12 w-12 opacity-30 animate-pulse" />
                <h3 className="font-semibold text-lg">No courses found</h3>
                <p className="text-sm">Try adjusting your filters or search query.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {courseList.map((course) => {
                const isUpdatingThis = updateMutation.isPending && updateMutation.variables?.id === course.id
                const hasInstructor = !!course.instructor
                const typeTextColor = 
                  course.courseType === 'THEORY' ? 'text-emerald-600 dark:text-emerald-400' :
                  course.courseType === 'LAB' ? 'text-amber-600 dark:text-amber-400' :
                  course.courseType === 'PROJECT' ? 'text-rose-600 dark:text-rose-455' :
                  'text-slate-900 dark:text-slate-100';

                return (
                  <Card 
                    key={course.id} 
                    className={cn(
                      "group relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border border-slate-200/85 dark:border-slate-800 border-t-[3.5px] border-t-emerald-600 bg-white dark:bg-slate-950 rounded-xl min-h-[238px]"
                    )}
                  >
                    <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      {/* Top Row */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tracking-wider text-xs bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            {course.code}
                          </span>
                          
                          {/* Options dropdown menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/80 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => setDetailCourseId(course.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="flex items-center">
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      <span>Assign Instructor</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent className="max-h-56 overflow-y-auto w-56">
                                        <DropdownMenuItem 
                                          className="text-amber-600 dark:text-amber-400 font-medium"
                                          onClick={() => {
                                            updateMutation.mutate({
                                              id: course.id,
                                              values: { instructorId: null }
                                            })
                                          }}
                                        >
                                          ❌ Unassign / None
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {facultyList?.map((faculty) => (
                                          <DropdownMenuItem
                                            key={faculty.id}
                                            onClick={() => {
                                              updateMutation.mutate({
                                                id: course.id,
                                                values: { instructorId: faculty.id }
                                              })
                                            }}
                                            className="flex items-center justify-between"
                                          >
                                            <span className="truncate">👤 {faculty.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-1">({faculty.facultyId})</span>
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingCourse(course)
                                      setFormOpen(true)
                                    }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Course
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteTarget(course)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Course
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Title and Department */}
                        <div className="space-y-1.5">
                          <h4 
                            className="font-bold text-sm sm:text-base leading-snug tracking-tight text-foreground line-clamp-2 hover:text-emerald-600 transition-colors cursor-pointer" 
                            onClick={() => setDetailCourseId(course.id)}
                          >
                            {course.name}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                            <GraduationCap className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">{course.department.name}</span>
                          </p>
                        </div>
                      </div>

                      {/* Middle Info (Type, Credits) */}
                      <div className="grid grid-cols-2 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden divide-x divide-slate-200/70 dark:divide-slate-800">
                        <div className="px-4 py-2 flex flex-col justify-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">Type</p>
                          <p className={cn("font-bold text-sm mt-1.5", typeTextColor)}>
                            {course.courseType.charAt(0) + course.courseType.slice(1).toLowerCase()}
                          </p>
                        </div>
                        <div className="px-4 py-2 flex flex-col justify-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">Credits</p>
                          <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-1.5">
                            {course.creditHours}
                            {course.labCreditHours > 0 && <span className="text-xs text-muted-foreground font-semibold"> +{course.labCreditHours}L</span>}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Instructor Section */}
                      <div 
                        onClick={() => setDetailCourseId(course.id)}
                        className="group/instructor bg-slate-50/60 hover:bg-slate-100/80 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-500 group-hover/instructor:text-primary group-hover/instructor:bg-slate-200 dark:group-hover/instructor:bg-slate-800 transition-colors shrink-0">
                            <User className="h-4.5 w-4.5 text-slate-600 dark:text-slate-350 shrink-0" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">Instructor</span>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1 truncate">
                              {course.instructor?.name || 'Not Assigned'}
                            </span>
                            {course.instructor ? (
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                ID: {course.instructor.facultyId}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
                                Needs Assignment
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-6.5 w-6.5 rounded-full bg-slate-200/60 dark:bg-slate-800/80 group-hover/instructor:bg-emerald-600/10 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover/instructor:text-emerald-600 transition-all duration-200 shrink-0">
                          {isUpdatingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <ArrowRight className="h-4 w-4 group-hover/instructor:translate-x-0.5 transition-transform" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination for Cards View */}
          {pagination && pagination.totalPages > 1 && (
            <Card className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="px-3 text-sm font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* Data Table */
        <Card>
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        className="cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? ''}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: columns.length }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full max-w-[120px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-10 w-10 opacity-30" />
                        <p>No courses found</p>
                        <p className="text-xs">Try adjusting your search or filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setDetailCourseId(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} onClick={(e) => {
                          if (cell.column.id === 'actions') e.stopPropagation()
                        }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="px-3 text-sm font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ==================== FORM DIALOG ==================== */}
      <CourseFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingCourse(null)
        }}
        editingCourse={editingCourse}
        departments={departments ?? []}
        facultyList={facultyList ?? []}
        onSubmit={(values) => {
          if (editingCourse) {
            updateMutation.mutate({ id: editingCourse.id, values })
          } else {
            createMutation.mutate(values as CreateCourseInput)
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* ==================== DETAIL SHEET ==================== */}
      <Sheet
        open={!!detailCourseId}
        onOpenChange={(open) => {
          if (!open) setDetailCourseId(null)
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
          <CourseDetailSheet
            detail={detailData?.data ?? null}
            isLoading={detailLoading}
            onEdit={() => {
              if (detailData?.data) {
                const c = detailData.data
                setEditingCourse({
                  id: c.id,
                  code: c.code,
                  name: c.name,
                  creditHours: c.creditHours,
                  labCreditHours: c.labCreditHours,
                  courseType: c.courseType,
                  semesterOffered: c.semesterOffered,
                  description: c.description,
                  objectives: c.objectives,
                  prerequisites: c.prerequisites,
                  isActive: c.isActive,
                  instructor: c.instructor ? { id: c.instructor.id, facultyId: c.instructor.facultyId, name: c.instructor.name } : null,
                  department: c.department,
                  enrollmentCount: c.enrollments.length,
                  createdAt: c.createdAt,
                })
                setFormOpen(true)
                setDetailCourseId(null)
              }
            }}
            isAdmin={isAdmin}
            onEnroll={() => {
              setEnrollCourseId(detailCourseId)
              setEnrollCourseSemesterOffered(detailData?.data?.semesterOffered || null)
              setEnrollDialogOpen(true)
            }}
          />
        </SheetContent>
      </Sheet>

      {/* ==================== ENROLLMENT DIALOG ==================== */}
      <EnrollmentDialog
        open={enrollDialogOpen}
        onOpenChange={(open) => {
          setEnrollDialogOpen(open)
          if (!open) {
            setEnrollCourseId(null)
            setEnrollCourseSemesterOffered(null)
          }
        }}
        courseId={enrollCourseId}
        semesterOffered={enrollCourseSemesterOffered}
        existingEnrollments={enrollmentsData?.data?.enrollments ?? []}
        onEnroll={({ studentIds, semesterId, section }) => {
          if (enrollCourseId) {
            enrollMutation.mutate({ courseId: enrollCourseId, studentIds, semesterId, section })
          }
        }}
        isSubmitting={enrollMutation.isPending}
      />

      {/* ==================== DELETE DIALOG ==================== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.code}: {deleteTarget?.name}</strong>? This will deactivate the
              course. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityType={'courses' as ImportEntityType}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['courses'] })
          queryClient.invalidateQueries({ queryKey: ['courses', 'stats'] })
        }}
      />
    </div>
  )
}

// ==================== FORM DIALOG COMPONENT ====================

interface CourseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCourse: CourseListItem | null
  departments: DepartmentOption[]
  facultyList: FacultyOption[]
  onSubmit: (values: CreateCourseInput | UpdateCourseInput) => void
  isSubmitting: boolean
}

function CourseFormDialog({
  open,
  onOpenChange,
  editingCourse,
  departments,
  facultyList,
  onSubmit,
  isSubmitting,
}: CourseFormDialogProps) {
  const isEdit = !!editingCourse

  const form = useForm<CreateCourseInput | UpdateCourseInput>({
    resolver: zodResolver(isEdit ? updateCourseSchema : createCourseSchema) as any,
    defaultValues: (isEdit
      ? {
          name: editingCourse.name,
          departmentId: editingCourse.department.id,
          creditHours: editingCourse.creditHours,
          labCreditHours: editingCourse.labCreditHours,
          courseType: editingCourse.courseType as 'THEORY' | 'LAB' | 'PROJECT' | 'SEMINAR',
          semesterOffered: editingCourse.semesterOffered,
          description: editingCourse.description ?? '',
          prerequisites: editingCourse.prerequisites ?? '[]',
          objectives: editingCourse.objectives ?? '',
          instructorId: editingCourse.instructor?.id ?? '',
        }
      : {
          code: '',
          name: '',
          departmentId: departments[0]?.id || '',
          creditHours: 3,
          labCreditHours: 0,
          courseType: 'THEORY',
          semesterOffered: null,
          description: '',
          prerequisites: '[]',
          objectives: '',
          instructorId: '',
        }) as any,
  })

  // Reset form values when editingCourse changes or dialog is opened
  useEffect(() => {
    if (open) {
      if (isEdit && editingCourse) {
        form.reset({
          name: editingCourse.name,
          departmentId: editingCourse.department.id,
          creditHours: editingCourse.creditHours,
          labCreditHours: editingCourse.labCreditHours,
          courseType: editingCourse.courseType as 'THEORY' | 'LAB' | 'PROJECT' | 'SEMINAR',
          semesterOffered: editingCourse.semesterOffered,
          description: editingCourse.description ?? '',
          prerequisites: editingCourse.prerequisites ?? '[]',
          objectives: editingCourse.objectives ?? '',
          instructorId: editingCourse.instructor?.id ?? '',
        } as any)
      } else {
        form.reset({
          code: '',
          name: '',
          departmentId: departments[0]?.id || '',
          creditHours: 3,
          labCreditHours: 0,
          courseType: 'THEORY',
          semesterOffered: null,
          description: '',
          prerequisites: '[]',
          objectives: '',
          instructorId: '',
        } as any)
      }
    }
  }, [open, editingCourse, isEdit, departments])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Course' : 'Add New Course'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the course information below.'
              : 'Fill in the details to add a new course to the catalog.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit(v))} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Course Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isEdit && (
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="CS201" className="font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Data Structures & Algorithms" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="courseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Type *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COURSE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="creditHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Hours *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={6} placeholder="3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="labCreditHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lab Credit Hours</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={4} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="semesterOffered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester Offered</FormLabel>
                      <Select
                        value={field.value ? String(field.value) : '_none'}
                        onValueChange={(v) => field.onChange(v === '_none' ? null : parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Any semester" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">Any Semester</SelectItem>
                          {Array.from({ length: 8 }, (_, i) => i + 1).map((sem) => (
                            <SelectItem key={sem} value={String(sem)}>
                              Semester {sem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instructorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructor</FormLabel>
                      <Select
                        value={field.value || '_none'}
                        onValueChange={(v) => field.onChange(v === '_none' ? null : v)}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Not assigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">Not Assigned</SelectItem>
                          {facultyList.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name} ({f.facultyId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : isEdit
                    ? 'Update Course'
                    : 'Create Course'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== DETAIL SHEET COMPONENT ====================

interface CourseDetailSheetProps {
  detail: CourseDetail | null
  isLoading: boolean
  onEdit: () => void
  isAdmin: boolean
  onEnroll: () => void
}

function CourseDetailSheet({ detail, isLoading, onEdit, isAdmin, onEnroll }: CourseDetailSheetProps) {
  const queryClient = useQueryClient()
  const [enrollCourseId, setEnrollCourseId] = useState<string | null>(null)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [enrollmentsData, setEnrollmentsData] = useState<{
    enrollments: CourseEnrollment[]
    semester: { id: string; name: string } | null
  } | null>(null)
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)

  const fetchEnrollments = async (courseId: string) => {
    setEnrollmentsLoading(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/enrollments`)
      if (res.ok) {
        const json = await res.json()
        setEnrollmentsData(json.data)
      }
    } finally {
      setEnrollmentsLoading(false)
    }
  }

  const handleEnrollTabClick = (courseId: string) => {
    setEnrollCourseId(courseId)
    fetchEnrollments(courseId)
  }

  if (isLoading) {
    return (
      <>
        <SheetHeader className="p-4 pb-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </SheetHeader>
        <div className="p-4 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </>
    )
  }

  if (!detail) return null

  return (
    <>
      <SheetHeader className="p-4 pb-2 border-b">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-lg">
                <span className="font-mono font-bold text-primary">{detail.code}</span>
                {' — '}{detail.name}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="secondary" className={courseTypeColor(detail.courseType)}>
                  {detail.courseType}
                </Badge>
                <span className="text-sm">{detail.department.name}</span>
                <span className="text-sm text-muted-foreground">
                  {detail.creditHours}{detail.labCreditHours > 0 ? `+${detail.labCreditHours}L` : ''} credits
                </span>
              </SheetDescription>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0 gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="info" className="w-full" onValueChange={(v) => {
          if (v === 'enrollments' && detail) handleEnrollTabClick(detail.id)
        }}>
          <TabsList className="mx-4 mt-2 w-auto">
            <TabsTrigger value="info" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5 hidden sm:block" />
              Info
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="gap-1.5">
              <Users className="h-3.5 w-3.5 hidden sm:block" />
              Enrollments
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 hidden sm:block" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* ===== INFO TAB ===== */}
          <TabsContent value="info" className="p-4 space-y-4 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem
                icon={<Users className="h-4 w-4" />}
                label="Instructor"
                value={detail.instructor ? (
                  <div>
                    <p className="font-medium">{detail.instructor.name}</p>
                    <p className="text-xs text-muted-foreground">{detail.instructor.designation}</p>
                  </div>
                ) : '—'}
              />
              <InfoItem
                icon={<BookOpen className="h-4 w-4" />}
                label="Semester Offered"
                value={detail.semesterOffered ? `Semester ${detail.semesterOffered}` : 'Any Semester'}
              />
              <InfoItem
                icon={<FileText className="h-4 w-4" />}
                label="Prerequisites"
                value={(() => {
                  if (!detail.prerequisites) return '—'
                  let list: string[] = []
                  if (Array.isArray(detail.prerequisites)) {
                    list = detail.prerequisites
                  } else if (typeof detail.prerequisites === 'string') {
                    if (detail.prerequisites === '[]' || detail.prerequisites.trim() === '') {
                      return '—'
                    }
                    try {
                      const parsed = JSON.parse(detail.prerequisites)
                      if (Array.isArray(parsed)) {
                        list = parsed
                      } else {
                        list = detail.prerequisites.split(',').map((s) => s.trim()).filter(Boolean)
                      }
                    } catch {
                      list = detail.prerequisites.split(',').map((s) => s.trim()).filter(Boolean)
                    }
                  }
                  if (list.length === 0) return '—'
                  return (
                    <div className="flex flex-wrap gap-1">
                      {list.map((p, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )
                })()}
              />
              <InfoItem
                icon={<BarChart3 className="h-4 w-4" />}
                label="Enrolled Students"
                value={<span className="font-semibold">{detail.enrollments.length}</span>}
              />
            </div>

            {detail.description && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Description</h4>
                <p className="text-sm leading-relaxed text-foreground/80">{detail.description}</p>
              </div>
            )}

            {detail.objectives && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Course Objectives</h4>
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{detail.objectives}</p>
              </div>
            )}

            {/* Documents */}
            {detail.documents.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents ({detail.documents.length})
                </h4>
                <div className="space-y-2">
                  {detail.documents.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border p-2.5 bg-muted/30"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category} {doc.fileType ? `· ${doc.fileType}` : ''}
                          {' · '}{doc.uploadedByUser.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== ENROLLMENTS TAB ===== */}
          <TabsContent value="enrollments" className="p-4 mt-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Enrolled Students</h3>
                {enrollmentsData?.semester && (
                  <p className="text-xs text-muted-foreground">
                    Semester: {enrollmentsData.semester.name}
                  </p>
                )}
              </div>
              {isAdmin && detail.id && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setEnrollCourseId(detail.id)
                    setEnrollDialogOpen(true)
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Enroll Students
                </Button>
              )}
            </div>

            {enrollmentsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : enrollmentsData && enrollmentsData.enrollments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No enrollments</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  No students enrolled in this course for the current semester.
                </p>
              </div>
            ) : enrollmentsData ? (
              <div className="max-h-96 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Section</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="hidden md:table-cell">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollmentsData.enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.student.studentId}</TableCell>
                        <TableCell className="font-medium">{e.student.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{e.section}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant="secondary"
                            className={
                              e.status === 'ENROLLED'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-secondary text-secondary-foreground'
                            }
                          >
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {e.result?.grade ? (
                            <Badge variant="secondary" className={gradeColor(e.result.grade)}>
                              {formatGrade(e.result.grade)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </TabsContent>

          {/* ===== RESULTS TAB ===== */}
          <TabsContent value="results" className="p-4 mt-0">
            {detail.resultsStats.totalGraded === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No results yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Results have not been published for this course.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Total Graded</p>
                    <p className="text-2xl font-bold mt-1">{detail.resultsStats.totalGraded}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Average Percentage</p>
                    <p className="text-2xl font-bold mt-1">
                      {detail.resultsStats.avgPercentage !== null
                        ? `${detail.resultsStats.avgPercentage}%`
                        : '—'}
                    </p>
                  </Card>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                    Grade Distribution
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(detail.resultsStats.gradeDistribution)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([grade, count]) => {
                        const maxCount = Math.max(
                          ...Object.values(detail.resultsStats.gradeDistribution)
                        )
                        const width = maxCount > 0 ? (count / maxCount) * 100 : 0
                        return (
                          <div key={grade} className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className={cn(gradeColor(grade), 'w-16 justify-center')}
                            >
                              {formatGrade(grade)}
                            </Badge>
                            <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  grade === 'A' || grade === 'A_MINUS'
                                    ? 'bg-emerald-500'
                                    : grade === 'B_PLUS' || grade === 'B' || grade === 'B_MINUS'
                                      ? 'bg-sky-500'
                                      : grade === 'C_PLUS' || grade === 'C' || grade === 'C_MINUS'
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                )}
                                style={{ width: `${Math.max(width, 8)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{count}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Inline Enrollment Dialog */}
      <EnrollmentDialog
        open={enrollDialogOpen}
        onOpenChange={(open) => {
          setEnrollDialogOpen(open)
          if (!open) setEnrollCourseId(null)
        }}
        courseId={enrollCourseId}
        semesterOffered={detail.semesterOffered}
        existingEnrollments={enrollmentsData?.enrollments ?? []}
        onEnroll={({ studentIds, semesterId, section }) => {
          // Use the enrollment mutation from parent
          fetch(`/api/courses/${enrollCourseId}/enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentIds, semesterId, section }),
          })
            .then(async (res) => {
              const json = await res.json()
              if (!res.ok) throw new Error(json.error || 'Failed to enroll')
              toast.success(`${json.data.enrolled} student(s) enrolled successfully`)
              queryClient.invalidateQueries({ queryKey: ['course-detail', detail.id] })
              queryClient.invalidateQueries({ queryKey: ['courses'] })
              setEnrollDialogOpen(false)
              // Re-fetch enrollments
              if (detail) fetchEnrollments(detail.id)
            })
            .catch((err) => toast.error(err.message))
        }}
        isSubmitting={false}
      />
    </>
  )
}

// ==================== ENROLLMENT DIALOG COMPONENT ====================

interface EnrollmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string | null
  existingEnrollments: CourseEnrollment[]
  onEnroll: (data: { studentIds: string[]; semesterId: string; section: string }) => void
  isSubmitting: boolean
  semesterOffered?: number | null
}

function EnrollmentDialog({
  open,
  onOpenChange,
  courseId,
  existingEnrollments,
  onEnroll,
  isSubmitting,
  semesterOffered,
}: EnrollmentDialogProps) {
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [section, setSection] = useState('A')
  const [semesterId, setSemesterId] = useState<string>('')
  const [filterSemester, setFilterSemester] = useState<string>('')
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Fetch current semester
  const { data: semesters } = useQuery<SemesterOption[]>({
    queryKey: ['semesters-for-enroll'],
    queryFn: async () => {
      const res = await fetch('/api/departments')
      return []
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch available students (search)
  const { data: studentResults, isLoading: studentsLoading } = useQuery<
    PaginatedResponse<{
      id: string
      studentId: string
      name: string
      email: string
      batch: string | null
      currentSemester: number
      status: string
    }>
  >({
    queryKey: ['students-for-enrollment', studentSearch, filterSemester],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '200')
      params.set('status', 'ACTIVE')
      if (filterSemester && filterSemester !== 'all') {
        params.set('semester', filterSemester)
      }
      if (studentSearch) params.set('search', studentSearch)
      const res = await fetch(`/api/students?${params}`)
      if (!res.ok) throw new Error('Failed to fetch students')
      return res.json()
    },
    enabled: open,
  })

  // Get current semester from existing enrollments
  const currentSemesterId = existingEnrollments.length > 0 ? existingEnrollments[0].semester.id : ''
  const currentSemesterName = existingEnrollments.length > 0 ? existingEnrollments[0].semester.name : ''

  // Set semester and filterSemester when dialog opens
  if (open && !initialized) {
    if (currentSemesterId) setSemesterId(currentSemesterId)
    setFilterSemester(semesterOffered ? String(semesterOffered) : '')
    setInitialized(true)
  }

  // Clean states when dialog is closed
  useEffect(() => {
    if (!open && initialized) {
      setInitialized(false)
      setSelectedStudents(new Set())
      setStudentSearch('')
      setSection('A')
      setSemesterId('')
      setFilterSemester('')
      setHasAutoSelected(false)
    }
  }, [open, initialized])

  const existingStudentIds = useMemo(() => new Set(existingEnrollments.map((e) => e.student.id)), [existingEnrollments])

  const availableStudents = useMemo(() => {
    return (studentResults?.data ?? []).filter(
      (s) => s.status !== 'INACTIVE' && !existingStudentIds.has(s.id)
    )
  }, [studentResults?.data, existingStudentIds])

  // Reset auto-select trigger when student results change
  useEffect(() => {
    setHasAutoSelected(false)
  }, [studentResults?.data])

  // Auto-select all matching active students by default
  useEffect(() => {
    if (availableStudents.length > 0 && !hasAutoSelected && open) {
      setSelectedStudents(new Set(availableStudents.map((s) => s.id)))
      setHasAutoSelected(true)
    }
  }, [availableStudents, hasAutoSelected, open])

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSubmit = () => {
    if (selectedStudents.size === 0) {
      toast.error('Select at least one student')
      return
    }
    if (!semesterId) {
      toast.error('Please select a semester')
      return
    }
    onEnroll({
      studentIds: Array.from(selectedStudents),
      semesterId,
      section,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enroll Students</DialogTitle>
          <DialogDescription>
            Search and select students to enroll in this course.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Semester Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Semester *</label>
            {currentSemesterId ? (
              <div className="flex items-center gap-2 rounded-lg border p-2.5 bg-muted/30">
                <span className="text-sm font-medium">{currentSemesterName}</span>
                <Badge variant="outline" className="text-xs">Current</Badge>
              </div>
            ) : (
              <Input placeholder="Semester ID" disabled />
            )}
          </div>

          {/* Section Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Section *</label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['A', 'B', 'C', 'D'].map((s) => (
                  <SelectItem key={s} value={s}>
                    Section {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Semester Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Student Semester Filter</label>
            <Select value={filterSemester || 'all'} onValueChange={(v) => setFilterSemester(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    Semester {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Students</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-2.5">
            <span className="text-sm font-medium text-primary">
              {selectedStudents.size} student(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudents(new Set(availableStudents.map(s => s.id)))}
                className="text-xs h-7 text-primary hover:text-primary hover:bg-primary/10"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudents(new Set())}
                className="text-xs h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Student List */}
          <div className="max-h-64 overflow-auto rounded-lg border">
            {studentsLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : availableStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No students found</p>
              </div>
            ) : (
              <div className="divide-y">
                {availableStudents.map((student) => {
                  const isSelected = selectedStudents.has(student.id)
                  return (
                    <div
                      key={student.id}
                      className={cn(
                        'flex items-center gap-3 p-2.5 cursor-pointer transition-colors hover:bg-muted/50',
                        isSelected && 'bg-primary/5'
                      )}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <Checkbox checked={isSelected} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.studentId} · Sem {student.currentSemester}
                          {student.batch ? ` · ${student.batch}` : ''}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Already Enrolled Info */}
          {existingEnrollments.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {existingEnrollments.length} student(s) already enrolled (excluded from list)
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedStudents.size === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enrolling...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Enroll {selectedStudents.size > 0 ? `(${selectedStudents.size})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== SMALL HELPERS ====================

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm mt-0.5">{value}</div>
      </div>
    </div>
  )
}
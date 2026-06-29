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
  Users,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  BookOpen,
  Clock,
  FolderKanban,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Upload,
  UserCircle,
  Sparkles,
} from 'lucide-react'

import { toast } from 'sonner'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/shared/page-header'
import { CsvImportDialog } from '@/components/shared/csv-import-dialog'
import type { ImportEntityType } from '@/components/shared/csv-import-dialog'
import { AiInput } from '@/components/shared/ai-input'

const AI_FILL_EVENT = 'ai-faculty-fill'

import {
  createFacultySchema,
  updateFacultySchema,
  DESIGNATIONS,
  type CreateFacultyInput,
  type UpdateFacultyInput,
} from '@/lib/validators/faculty'

// ==================== TYPES ====================

interface FacultyUser {
  id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  isActive: boolean
}

interface FacultyDepartment {
  id: string
  name: string
  code: string
}

interface FacultyListItem {
  id: string
  facultyId: string
  designation: string
  specialization: string | null
  highestDegree: string | null
  officeRoom: string | null
  officeHours: string | null
  isAvailable: boolean
  bio: string | null
  createdAt: string
  user: FacultyUser
  department: FacultyDepartment
  courseCount: number
}

interface FacultyDetail extends Omit<FacultyListItem, 'courseCount'> {
  user: FacultyUser & { lastLogin: string | null; createdAt: string }
  courses: { id: string; code: string; name: string; creditHours: number; courseType: string; isActive: boolean }[]
  timetables: {
    id: string
    day: string
    startTime: string
    endTime: string
    slotType: string
    course: { id: string; code: string; name: string }
    room: { id: string; name: string; building: string }
    semester: { id: string; name: string }
  }[]
  supervisedProjects: {
    id: string
    title: string
    status: string
    domain: string | null
    semester: { id: string; name: string }
    members: {
      student: {
        studentId: string
        user: { name: string }
      }
    }[]
  }[]
}

interface FacultyStats {
  total: number
  byDesignation: Record<string, number>
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

// ==================== HELPER: Designation Color ====================

function designationColor(d: string) {
  switch (d) {
    case 'Professor':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'Assoc Professor':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
    case 'Asst Professor':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300'
    case 'Lecturer':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    case 'Lab Engineer':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

function statusColor(available: boolean) {
  return available
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
}

// ==================== DEPARTMENTS QUERY ====================

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

// ==================== MAIN COMPONENT ====================

export function FacultyModule() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [designationFilter, setDesignationFilter] = useState<string>('_all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('_all')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'facultyId', desc: false }])

  // Dialog / Sheet
  const [formOpen, setFormOpen] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<FacultyListItem | null>(null)
  const [detailFacultyId, setDetailFacultyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FacultyListItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  // Build query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '20')
    if (search) params.set('search', search)
    if (designationFilter !== '_all') params.set('designation', designationFilter)
    if (departmentFilter !== '_all') params.set('departmentId', departmentFilter)
    return params.toString()
  }, [page, search, designationFilter, departmentFilter])

  // Data queries
  const { data: facultyData, isLoading } = useQuery<PaginatedResponse<FacultyListItem>>({
    queryKey: ['faculty', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/faculty?${queryString}`)
      if (!res.ok) throw new Error('Failed to fetch faculty')
      return res.json()
    },
    placeholderData: keepPreviousData,
  })

  const { data: stats } = useQuery<ApiOk<FacultyStats>>({
    queryKey: ['faculty-stats'],
    queryFn: async () => {
      const res = await fetch('/api/faculty/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  const { data: detailData, isLoading: detailLoading } = useQuery<ApiOk<FacultyDetail>>({
    queryKey: ['faculty-detail', detailFacultyId],
    queryFn: async () => {
      const res = await fetch(`/api/faculty/${detailFacultyId}`)
      if (!res.ok) throw new Error('Failed to fetch faculty detail')
      return res.json()
    },
    enabled: !!detailFacultyId,
  })

  const { data: departments } = useDepartments()

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: CreateFacultyInput) => {
      const res = await fetch('/api/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create faculty')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] })
      queryClient.invalidateQueries({ queryKey: ['faculty-stats'] })
      toast.success('Faculty member created successfully')
      setFormOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UpdateFacultyInput }) => {
      const res = await fetch(`/api/faculty/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update faculty')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] })
      queryClient.invalidateQueries({ queryKey: ['faculty-stats'] })
      if (detailFacultyId) queryClient.invalidateQueries({ queryKey: ['faculty-detail', detailFacultyId] })
      toast.success('Faculty updated successfully')
      setFormOpen(false)
      setEditingFaculty(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/faculty/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete faculty')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] })
      queryClient.invalidateQueries({ queryKey: ['faculty-stats'] })
      toast.success('Faculty deleted successfully')
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err.message),
  })

  // Table setup
  const facultyList = facultyData?.data ?? []
  const pagination = facultyData?.pagination

  const columns = useMemo<ColumnDef<FacultyListItem>[]>(
    () => [
      {
        accessorKey: 'facultyId',
        header: 'Faculty ID',
        size: 110,
      },
      {
        accessorKey: 'user.name',
        header: 'Name',
        cell: ({ row }) => {
          const f = row.original
          const initials = f.user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{f.user.name}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'user.email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.original.user.email}</span>
        ),
      },
      {
        accessorKey: 'designation',
        header: 'Designation',
        cell: ({ row }) => (
          <Badge variant="secondary" className={designationColor(row.original.designation)}>
            {row.original.designation}
          </Badge>
        ),
      },
      {
        accessorKey: 'specialization',
        header: 'Specialization',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.specialization || '—'}</span>
        ),
      },
      {
        accessorKey: 'courseCount',
        header: 'Courses',
        size: 80,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-semibold">
            {row.original.courseCount}
          </Badge>
        ),
      },
      {
        accessorKey: 'isAvailable',
        header: 'Status',
        size: 110,
        cell: ({ row }) => (
          <Badge variant="secondary" className={statusColor(row.original.isAvailable)}>
            {row.original.isAvailable ? 'Available' : 'Unavailable'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        size: 50,
        cell: ({ row }) => {
          const f = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailFacultyId(f.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {user?.role === 'ADMIN' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingFaculty(f)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(f)}
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
    data: facultyList,
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
        title="Faculty"
        description="Manage faculty profiles, courses, and office hours"
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setEditingFaculty(null)
                  setFormOpen(true)
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Faculty
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
            <p className="text-xs text-muted-foreground mt-1">Total Faculty</p>
          </Card>
          {Object.entries(stats.data.byDesignation).map(([key, val]) => (
            <Card key={key} className="p-4">
              <div className="text-2xl font-bold">{val}</div>
              <p className="text-xs text-muted-foreground mt-1">{key}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, email, specialization..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={designationFilter}
            onValueChange={(v) => {
              setDesignationFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Designation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Designations</SelectItem>
              {DESIGNATIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {departments && departments.length > 0 && (
            <Select
              value={departmentFilter}
              onValueChange={(v) => {
                setDepartmentFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      {/* Data Table */}
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
                Array.from({ length: 5 }).map((_, i) => (
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
                      <Users className="h-10 w-10 opacity-30" />
                      <p>No faculty members found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setDetailFacultyId(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} onClick={(e) => {
                        // Prevent row click when clicking action buttons
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

      {/* ==================== FORM DIALOG ==================== */}
      <FacultyFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingFaculty(null)
        }}
        editingFaculty={editingFaculty}
        departments={departments ?? []}
        onSubmit={(values) => {
          if (editingFaculty) {
            updateMutation.mutate({ id: editingFaculty.id, values })
          } else {
            createMutation.mutate(values as CreateFacultyInput)
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onAiOpen={() => setAiOpen(true)}
      />

      {/* ==================== DETAIL SHEET ==================== */}
      <Sheet
        open={!!detailFacultyId}
        onOpenChange={(open) => {
          if (!open) setDetailFacultyId(null)
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-hidden flex flex-col">
          <FacultyDetailSheet
            detail={detailData?.data ?? null}
            isLoading={detailLoading}
            onEdit={() => {
              if (detailData?.data) {
                const f = detailData.data
                setEditingFaculty({
                  id: f.id,
                  facultyId: f.facultyId,
                  designation: f.designation,
                  specialization: f.specialization,
                  highestDegree: f.highestDegree,
                  officeRoom: f.officeRoom,
                  officeHours: f.officeHours,
                  isAvailable: f.isAvailable,
                  bio: f.bio,
                  createdAt: f.createdAt,
                  user: f.user,
                  department: f.department,
                  courseCount: f.courses.length,
                })
                setFormOpen(true)
                setDetailFacultyId(null)
              }
            }}
            isAdmin={isAdmin}
          />
        </SheetContent>
      </Sheet>

      {/* ==================== DELETE DIALOG ==================== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faculty Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.user.name}</strong> ({deleteTarget?.facultyId})? This will
              deactivate their account. This action cannot be easily undone.
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
        entityType={'faculty' as ImportEntityType}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['faculty'] })
          queryClient.invalidateQueries({ queryKey: ['faculty', 'stats'] })
        }}
      />

      {/* AI Smart Entry */}
      <AiInput
        open={aiOpen}
        onOpenChange={setAiOpen}
        entityType="faculty"
        onParsed={(data) => {
          // We need to find the form instance inside FacultyFormDialog
          // Instead, we dispatch a custom event
          window.dispatchEvent(new CustomEvent('ai-faculty-fill', { detail: data }))
        }}
      />
    </div>
  )
}

// ==================== FORM DIALOG COMPONENT ====================

interface FacultyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingFaculty: FacultyListItem | null
  departments: DepartmentOption[]
  onSubmit: (values: CreateFacultyInput | UpdateFacultyInput) => void
  isSubmitting: boolean
  onAiOpen?: () => void
}

function FacultyFormDialog({
  open,
  onOpenChange,
  editingFaculty,
  departments,
  onSubmit,
  isSubmitting,
  onAiOpen,
}: FacultyFormDialogProps) {
  const isEdit = !!editingFaculty

  const form = useForm<CreateFacultyInput | UpdateFacultyInput>({
    resolver: zodResolver(isEdit ? updateFacultySchema : createFacultySchema),
    defaultValues: isEdit
      ? {
          name: editingFaculty.user.name,
          email: editingFaculty.user.email,
          phone: editingFaculty.user.phone ?? '',
          bio: editingFaculty.bio ?? '',
          designation: editingFaculty.designation as any,
          specialization: editingFaculty.specialization ?? '',
          highestDegree: editingFaculty.highestDegree ?? '',
          departmentId: editingFaculty.department.id,
          officeRoom: editingFaculty.officeRoom ?? '',
          officeHours: editingFaculty.officeHours ?? '',
        }
      : {
          name: '',
          email: '',
          password: '',
          facultyId: '',
          designation: 'Asst Professor',
          specialization: '',
          highestDegree: '',
          departmentId: '',
          officeRoom: '',
          officeHours: '',
          phone: '',
          bio: '',
        },
  })

  // Reset form when editing faculty changes
  const resetKey = editingFaculty?.id ?? 'new'
  const [lastResetKey, setLastResetKey] = useState(resetKey)
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey)
    if (isEdit) {
      form.reset({
        name: editingFaculty.user.name,
        email: editingFaculty.user.email,
        phone: editingFaculty.user.phone ?? '',
        bio: editingFaculty.bio ?? '',
        designation: editingFaculty.designation as any,
        specialization: editingFaculty.specialization ?? '',
        highestDegree: editingFaculty.highestDegree ?? '',
        departmentId: editingFaculty.department.id,
        officeRoom: editingFaculty.officeRoom ?? '',
        officeHours: editingFaculty.officeHours ?? '',
      })
    } else {
      form.reset({
        name: '',
        email: '',
        password: '',
        facultyId: '',
        designation: 'Asst Professor',
        specialization: '',
        highestDegree: '',
        departmentId: '',
        officeRoom: '',
        officeHours: '',
        phone: '',
        bio: '',
      })
    }
  }

  // Listen for AI fill events
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail as Record<string, any>
      if (data.name) form.setValue('name', data.name)
      if (data.email) form.setValue('email', data.email)
      if (data.facultyId) form.setValue('facultyId', data.facultyId)
      if (data.designation) form.setValue('designation', data.designation)
      if (data.specialization) form.setValue('specialization', data.specialization)
      if (data.highestDegree) form.setValue('highestDegree', data.highestDegree)
      if (data.officeRoom) form.setValue('officeRoom', data.officeRoom)
      if (data.phone) form.setValue('phone', data.phone)
    }
    window.addEventListener(AI_FILL_EVENT, handler)
    return () => window.removeEventListener(AI_FILL_EVENT, handler)
  }, [form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? 'Edit Faculty Member' : 'Add New Faculty Member'}</DialogTitle>
            {!isEdit && onAiOpen && (
              <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30" onClick={onAiOpen}>
                <Sparkles className="size-3.5" />
                AI Assist
              </Button>
            )}
          </div>
          <DialogDescription>
            {isEdit
              ? 'Update the faculty member profile information below.'
              : 'Fill in the details to add a new faculty member.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit(v))} className="space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Jane Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jane.smith@csdept.edu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isEdit && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min 6 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+92-300-1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief bio about the faculty member..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Professional Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Professional Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isEdit && (
                  <FormField
                    control={form.control}
                    name="facultyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Faculty ID *</FormLabel>
                        <FormControl>
                          <Input placeholder="F-006" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DESIGNATIONS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
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
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization *</FormLabel>
                      <FormControl>
                        <Input placeholder="Machine Learning, AI, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="highestDegree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Highest Degree *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ph.D. Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
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

            <Separator />

            {/* Office Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Office Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="officeRoom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Room</FormLabel>
                      <FormControl>
                        <Input placeholder="Room-205, Block A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="officeHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Hours</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={'{"Mon": "10:00-12:00", "Wed": "14:00-16:00"}'}
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        JSON format: {'{"Mon": "10:00-12:00", "Wed": "14:00-16:00"}'}
                      </p>
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
                    ? 'Update Faculty'
                    : 'Create Faculty'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== DETAIL SHEET COMPONENT ====================

interface FacultyDetailSheetProps {
  detail: FacultyDetail | null
  isLoading: boolean
  onEdit: () => void
  isAdmin: boolean
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
}

function FacultyDetailSheet({ detail, isLoading, onEdit, isAdmin }: FacultyDetailSheetProps) {
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

  const initials = detail.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  let parsedOfficeHours: Record<string, string> | null = null
  if (detail.officeHours) {
    try {
      parsedOfficeHours = JSON.parse(detail.officeHours)
    } catch {
      // not valid JSON
    }
  }

  return (
    <>
      <SheetHeader className="p-4 pb-2 border-b">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg">{detail.user.name}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary" className={designationColor(detail.designation)}>
                {detail.designation}
              </Badge>
              <span className="text-sm">{detail.department.name}</span>
            </SheetDescription>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0 gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mx-4 mt-2 w-auto">
            <TabsTrigger value="profile" className="gap-1.5">
              <UserCircle className="h-3.5 w-3.5 hidden sm:block" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5 hidden sm:block" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5">
              <Clock className="h-3.5 w-3.5 hidden sm:block" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5">
              <FolderKanban className="h-3.5 w-3.5 hidden sm:block" />
              Projects
            </TabsTrigger>
          </TabsList>

          {/* ===== PROFILE TAB ===== */}
          <TabsContent value="profile" className="p-4 space-y-4 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem icon={<GraduationCap className="h-4 w-4" />} label="Faculty ID" value={detail.facultyId} />
              <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={detail.user.email} />
              <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={detail.user.phone || '—'} />
              <InfoItem icon={<MapPin className="h-4 w-4" />} label="Office Room" value={detail.officeRoom || '—'} />
              <InfoItem icon={<BookOpen className="h-4 w-4" />} label="Specialization" value={detail.specialization || '—'} />
              <InfoItem icon={<GraduationCap className="h-4 w-4" />} label="Highest Degree" value={detail.highestDegree || '—'} />
              <InfoItem
                icon={<Clock className="h-4 w-4" />}
                label="Status"
                value={
                  <Badge variant="secondary" className={statusColor(detail.isAvailable)}>
                    {detail.isAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                }
              />
            </div>

            {/* Office Hours */}
            {parsedOfficeHours && Object.keys(parsedOfficeHours).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Office Hours
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(parsedOfficeHours).map(([day, time]) => (
                    <div
                      key={day}
                      className="rounded-lg border p-2.5 bg-muted/30"
                    >
                      <p className="text-xs font-medium text-muted-foreground">{day}</p>
                      <p className="text-sm font-semibold mt-0.5">{time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.bio && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Bio</h4>
                <p className="text-sm leading-relaxed text-foreground/80">{detail.bio}</p>
              </div>
            )}
          </TabsContent>

          {/* ===== COURSES TAB ===== */}
          <TabsContent value="courses" className="p-4 mt-0">
            {detail.courses.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-10 w-10" />}
                title="No courses assigned"
                description="This faculty member has no course assignments."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Course Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Credits</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.courses.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{c.creditHours}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{c.courseType}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* ===== SCHEDULE TAB ===== */}
          <TabsContent value="schedule" className="p-4 mt-0">
            {detail.timetables.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-10 w-10" />}
                title="No schedule"
                description="No timetable entries for the current semester."
              />
            ) : (
              <div className="space-y-2">
                {detail.timetables.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border p-3"
                  >
                    <Badge variant="outline" className="w-fit">
                      {DAY_LABELS[slot.day] ?? slot.day}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {slot.course.code}: {slot.course.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {slot.room.name}, {slot.room.building}
                      </p>
                    </div>
                    <div className="text-sm font-mono text-muted-foreground shrink-0">
                      {slot.startTime} – {slot.endTime}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== PROJECTS TAB ===== */}
          <TabsContent value="projects" className="p-4 mt-0">
            {detail.supervisedProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-10 w-10" />}
                title="No supervised projects"
                description="This faculty member is not supervising any FYP projects."
              />
            ) : (
              <div className="space-y-3">
                {detail.supervisedProjects.map((p) => (
                  <Card key={p.id} className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{p.title}</p>
                          {p.domain && (
                            <p className="text-xs text-muted-foreground mt-0.5">{p.domain}</p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'shrink-0',
                            p.status === 'APPROVED' || p.status === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : p.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-secondary text-secondary-foreground'
                          )}
                        >
                          {p.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Semester: {p.semester.name}</span>
                        {p.members.length > 0 && (
                          <span>
                            Team: {p.members.map((m) => m.student.user.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </>
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

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-muted-foreground/30 mb-3">{icon}</div>
      <p className="font-medium text-muted-foreground">{title}</p>
      <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>
    </div>
  )
}
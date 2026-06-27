'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderKanban,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  Eye,
  ChevronDown,
  UserPlus,
  UserMinus,
  Flag,
  MessageSquare,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

// Types
interface ProjectMember {
  id: string
  role: string
  student: {
    id: string
    studentId: string
    user: { name: string; email: string; avatar?: string | null }
  }
}

interface Milestone {
  id: string
  title: string
  description: string | null
  dueDate: string
  completedDate: string | null
  status: string
  feedback: string | null
}

interface Evaluation {
  id: string
  evaluationType: string
  criteriaScores: string
  totalScore: number | null
  maxTotalScore: number | null
  comments: string | null
  evaluatedAt: string | null
  evaluator: { user: { name: string } }
}

interface Project {
  id: string
  title: string
  description: string
  status: string
  domain: string | null
  methodology: string | null
  supervisorName: string
  _memberCount: number
  members?: ProjectMember[]
  milestones?: Milestone[]
  semester?: { id: string; name: string }
  createdAt: string
}

interface ProjectDetail extends Project {
  supervisor: { user: { name: string; email: string } }
  coSupervisor?: { user: { name: string; email: string } } | null
  coSupervisorName?: string | null
  semester: { id: string; name: string; type: string; year: number }
  members: ProjectMember[]
  milestones: Milestone[]
  evaluations: Evaluation[]
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  byDomain: Record<string, number>
}

interface FacultyOption {
  id: string
  facultyId: string
  name: string
  designation: string
}

interface StudentOption {
  id: string
  studentId: string
  name: string
}

interface SemesterOption {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  PROPOSED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  APPROVED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  EVALUATED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  DEFENDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  PASSED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
}

function getStatusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function FYPModule() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterSupervisor, setFilterSupervisor] = useState<string>('ALL')
  const [filterDomain, setFilterDomain] = useState<string>('ALL')

  // Detail sheet
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Sub-dialogs within detail sheet
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false)
  const [addEvaluationOpen, setAddEvaluationOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    semesterId: '',
    supervisorId: '',
    coSupervisorId: '',
    domain: '',
    methodology: '',
  })

  // Milestone form
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', dueDate: '' })

  // Evaluation form
  const [evalForm, setEvalForm] = useState({
    evaluationType: 'SUPERVISOR',
    evaluatorId: '',
    totalScore: '',
    comments: '',
  })

  // Add member form
  const [memberForm, setMemberForm] = useState({ studentId: '', role: 'MEMBER' })

  // Queries
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(pageSize))
    if (filterStatus !== 'ALL') params.set('status', filterStatus)
    if (filterSupervisor !== 'ALL') params.set('supervisorId', filterSupervisor)
    if (filterDomain !== 'ALL') params.set('domain', filterDomain)
    return params.toString()
  }, [page, pageSize, filterStatus, filterSupervisor, filterDomain])

  const { data, isLoading } = useQuery({
    queryKey: ['projects', queryParams],
    queryFn: () => fetch(`/api/projects?${queryParams}`).then((r) => r.json()),
  })

  const { data: statsData } = useQuery({
    queryKey: ['project-stats'],
    queryFn: () => fetch('/api/projects/stats').then((r) => r.json()),
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['project-detail', selectedProjectId],
    queryFn: () =>
      selectedProjectId ? fetch(`/api/projects/${selectedProjectId}`).then((r) => r.json()) : null,
    enabled: !!selectedProjectId && detailOpen,
  })

  // Reference data
  const { data: facultyData } = useQuery({
    queryKey: ['faculty-select'],
    queryFn: () => fetch('/api/faculty').then((r) => r.json()),
  })
  const facultyList: FacultyOption[] = (facultyData?.data || []).map((f: any) => ({
    id: f.id,
    facultyId: f.facultyId,
    name: f.name,
    designation: f.designation,
  }))

  const { data: studentsData } = useQuery({
    queryKey: ['students-select'],
    queryFn: () => fetch('/api/students?limit=50').then((r) => r.json()),
  })
  const studentList: StudentOption[] = (studentsData?.data || []).map((s: any) => ({
    id: s.id,
    studentId: s.studentId,
    name: s.name,
  }))

  const { data: semestersData } = useQuery({
    queryKey: ['semesters-select'],
    queryFn: () => fetch('/api/semesters').then((r) => r.json()),
  })
  const semesterList: SemesterOption[] = semestersData?.data || []

  const projects: Project[] = data?.data || []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages || 1
  const stats: Stats | null = statsData?.data || null
  const detail: ProjectDetail | null = detailData?.data || null

  // Auto-seed
  useEffect(() => {
    if (data && pagination?.total === 0) {
      fetch('/api/projects/seed', { method: 'POST' }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['project-stats'] })
      })
    }
  }, [data, pagination, queryClient])

  // Get unique domains from projects
  const domains = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((p) => { if (p.domain) set.add(p.domain) })
    return Array.from(set).sort()
  }, [projects])

  // Milestone progress for a project
  function getMilestoneProgress(ms: Milestone[] | undefined) {
    if (!ms || ms.length === 0) return { completed: 0, total: 0, percent: 0 }
    const completed = ms.filter((m) => m.status === 'COMPLETED').length
    return { completed, total: ms.length, percent: Math.round((completed / ms.length) * 100) }
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) =>
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Project created')
        setCreateOpen(false)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['project-stats'] })
      } else {
        toast.error(res.error || 'Failed to create')
      }
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/projects/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Status updated')
        setStatusDialogOpen(false)
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['project-detail'] })
        queryClient.invalidateQueries({ queryKey: ['project-stats'] })
      } else {
        toast.error(res.error || 'Failed to update status')
      }
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: ({ projectId, body }: { projectId: string; body: any }) =>
      fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Member added')
        setAddMemberOpen(false)
        setMemberForm({ studentId: '', role: 'MEMBER' })
        queryClient.invalidateQueries({ queryKey: ['project-detail'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      } else {
        toast.error(res.error || 'Failed to add member')
      }
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: ({ projectId, studentId }: { projectId: string; studentId: string }) =>
      fetch(`/api/projects/${projectId}/members/${studentId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Member removed')
        queryClient.invalidateQueries({ queryKey: ['project-detail'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      } else {
        toast.error(res.error || 'Failed to remove member')
      }
    },
  })

  const addMilestoneMutation = useMutation({
    mutationFn: ({ projectId, body }: { projectId: string; body: any }) =>
      fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Milestone added')
        setAddMilestoneOpen(false)
        setMilestoneForm({ title: '', description: '', dueDate: '' })
        queryClient.invalidateQueries({ queryKey: ['project-detail'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      } else {
        toast.error(res.error || 'Failed to add milestone')
      }
    },
  })

  const updateMilestoneStatusMutation = useMutation({
    mutationFn: ({
      projectId, milestoneId, body,
    }: { projectId: string; milestoneId: string; body: any }) =>
      fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Milestone updated')
        queryClient.invalidateQueries({ queryKey: ['project-detail'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      } else {
        toast.error(res.error || 'Failed to update milestone')
      }
    },
  })

  const addEvaluationMutation = useMutation({
    mutationFn: ({ projectId, body }: { projectId: string; body: any }) =>
      fetch(`/api/projects/${projectId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Evaluation submitted')
        setAddEvaluationOpen(false)
        setEvalForm({ evaluationType: 'SUPERVISOR', evaluatorId: '', totalScore: '', comments: '' })
        queryClient.invalidateQueries({ queryKey: ['project-detail'] })
      } else {
        toast.error(res.error || 'Failed to submit evaluation')
      }
    },
  })

  function resetForm() {
    setForm({ title: '', description: '', semesterId: '', supervisorId: '', coSupervisorId: '', domain: '', methodology: '' })
  }

  function openDetail(id: string) {
    setSelectedProjectId(id)
    setDetailOpen(true)
  }

  function handleCreate() {
    if (!form.title || !form.description || !form.semesterId || !form.supervisorId) {
      toast.error('Title, description, semester, and supervisor are required')
      return
    }
    createMutation.mutate({
      ...form,
      coSupervisorId: form.coSupervisorId || undefined,
      domain: form.domain || undefined,
      methodology: form.methodology || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="FYP Projects"
        description="Manage final year project proposals, teams, and evaluations"
        actions={
          <Button onClick={() => { resetForm(); setCreateOpen(true) }} size="sm">
            <Plus className="size-4 mr-1.5" />
            New Project
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <FolderKanban className="size-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <Loader2 className="size-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.byStatus?.IN_PROGRESS ?? 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <CheckCircle2 className="size-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats?.byStatus?.PASSED ?? 0) + (stats?.byStatus?.DEFENDED ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-100 p-2.5 dark:bg-rose-900/30">
                <Flag className="size-5 text-rose-700 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.byStatus?.EVALUATED ?? 0}</p>
                <p className="text-xs text-muted-foreground">Under Evaluation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1) }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PROPOSED">Proposed</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="EVALUATED">Evaluated</SelectItem>
              <SelectItem value="DEFENDED">Defended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSupervisor} onValueChange={(v) => { setFilterSupervisor(v); setPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Supervisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Supervisors</SelectItem>
              {facultyList.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDomain} onValueChange={(v) => { setFilterDomain(v); setPage(1) }}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Domains</SelectItem>
              {domains.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Table */}
      {isLoading ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 7 }).map((_, i) => (
                  <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No FYP projects yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Domain</TableHead>
                <TableHead className="hidden lg:table-cell">Supervisor</TableHead>
                <TableHead className="hidden sm:table-cell">Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Progress</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const mp = getMilestoneProgress(project.milestones)
                return (
                  <TableRow key={project.id} className="cursor-pointer" onClick={() => openDetail(project.id)}>
                    <TableCell>
                      <div className="font-medium text-sm">{project.title}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {project.domain && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {project.domain}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {project.supervisorName}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <Users className="size-3.5 text-muted-foreground" />
                        <span className="text-sm">{project._memberCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_COLORS[project.status] || STATUS_COLORS.PROPOSED}>
                        {getStatusLabel(project.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={mp.percent} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {mp.percent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(project.id) }}>
                            <Eye className="size-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); setDeleteOpen(true) }}>
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* ==================== DETAIL SHEET ==================== */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-3 mt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : detail ? (
            <div className="space-y-6 p-6">
              <SheetHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={STATUS_COLORS[detail.status] || STATUS_COLORS.PROPOSED}>
                    {getStatusLabel(detail.status)}
                  </Badge>
                  {detail.domain && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {detail.domain}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-xl">{detail.title}</SheetTitle>
                <SheetDescription>{detail.semester?.name || ''}</SheetDescription>
              </SheetHeader>

              {/* Project Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Supervisor</span>
                  <p className="font-medium">{detail.supervisor?.user?.name || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Co-Supervisor</span>
                  <p className="font-medium">{detail.coSupervisor?.user?.name || 'None'}</p>
                </div>
                {detail.methodology && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Methodology</span>
                    <p className="font-medium text-sm mt-0.5">{detail.methodology}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Tabs */}
              <Tabs defaultValue="members" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="members" className="flex-1">
                    <Users className="size-4 mr-1.5" />
                    Members
                  </TabsTrigger>
                  <TabsTrigger value="milestones" className="flex-1">
                    <Flag className="size-4 mr-1.5" />
                    Milestones
                  </TabsTrigger>
                  <TabsTrigger value="evaluations" className="flex-1">
                    <MessageSquare className="size-4 mr-1.5" />
                    Evaluations
                  </TabsTrigger>
                </TabsList>

                {/* Members Tab */}
                <TabsContent value="members" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {detail.members.length} member{detail.members.length !== 1 ? 's' : ''}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setAddMemberOpen(true)}>
                      <UserPlus className="size-4 mr-1.5" />
                      Add Member
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detail.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No team members yet</p>
                    ) : (
                      detail.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="size-9">
                              <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
                                {getInitials(member.student.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{member.student.user.name}</div>
                              <div className="text-xs text-muted-foreground">{member.student.studentId}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {member.role}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-red-500 hover:text-red-600"
                              onClick={() =>
                                removeMemberMutation.mutate({
                                  projectId: detail.id,
                                  studentId: member.student.id,
                                })
                              }
                              disabled={removeMemberMutation.isPending}
                            >
                              <UserMinus className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Milestones Tab */}
                <TabsContent value="milestones" className="space-y-3 mt-3">
                  {(() => {
                    const mp = getMilestoneProgress(detail.milestones)
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {mp.completed}/{mp.total} completed
                            </span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setAddMilestoneOpen(true)}>
                            <Plus className="size-4 mr-1.5" />
                            Add
                          </Button>
                        </div>
                        <Progress value={mp.percent} className="h-2" />
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {detail.milestones.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No milestones yet</p>
                          ) : (
                            detail.milestones.map((ms) => (
                              <div key={ms.id} className="rounded-lg border p-3 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm">{ms.title}</div>
                                    {ms.description && (
                                      <div className="text-xs text-muted-foreground">{ms.description}</div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge variant="secondary" className={MILESTONE_STATUS_COLORS[ms.status] || MILESTONE_STATUS_COLORS.PENDING}>
                                      {ms.status.replace(/_/g, ' ')}
                                    </Badge>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-7">
                                          <ChevronDown className="size-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {['PENDING', 'IN_PROGRESS', 'COMPLETED'].filter((s) => s !== ms.status).map((s) => (
                                          <DropdownMenuItem
                                            key={s}
                                            onClick={() =>
                                              updateMilestoneStatusMutation.mutate({
                                                projectId: detail.id,
                                                milestoneId: ms.id,
                                                body: { status: s },
                                              })
                                            }
                                          >
                                            Mark {s.replace(/_/g, ' ')}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    Due: {formatDate(ms.dueDate)}
                                  </span>
                                  {ms.completedDate && (
                                    <span className="flex items-center gap-1 text-emerald-600">
                                      <CheckCircle2 className="size-3" />
                                      Done: {formatDate(ms.completedDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )
                  })()}
                </TabsContent>

                {/* Evaluations Tab */}
                <TabsContent value="evaluations" className="space-y-3 mt-3">
                  <div className="flex items-center justify-end">
                    <Button size="sm" variant="outline" onClick={() => setAddEvaluationOpen(true)}>
                      <Plus className="size-4 mr-1.5" />
                      Add Evaluation
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {detail.evaluations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No evaluations yet</p>
                    ) : (
                      detail.evaluations.map((ev) => {
                        let scores: Record<string, number> = {}
                        try { scores = JSON.parse(ev.criteriaScores) } catch {}
                        return (
                          <div key={ev.id} className="rounded-lg border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{ev.evaluationType}</Badge>
                                <span className="text-sm font-medium">
                                  {ev.evaluator.user.name}
                                </span>
                              </div>
                              {ev.totalScore != null && (
                                <div className="text-right">
                                  <span className="text-lg font-bold text-emerald-700">{ev.totalScore}</span>
                                  <span className="text-xs text-muted-foreground">/{ev.maxTotalScore || 100}</span>
                                </div>
                              )}
                            </div>
                            {Object.keys(scores).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(scores).map(([key, val]) => (
                                  <span key={key} className="text-xs bg-muted rounded-md px-2 py-0.5">
                                    {key}: {val}
                                  </span>
                                ))}
                              </div>
                            )}
                            {ev.comments && (
                              <p className="text-xs text-muted-foreground italic">&quot;{ev.comments}&quot;</p>
                            )}
                            {ev.evaluatedAt && (
                              <p className="text-xs text-muted-foreground">{formatDate(ev.evaluatedAt)}</p>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Status Actions */}
              <Separator />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => {
                    // Determine next valid status
                    const transitions: Record<string, string> = {
                      PROPOSED: 'APPROVED',
                      APPROVED: 'IN_PROGRESS',
                      IN_PROGRESS: 'SUBMITTED',
                      SUBMITTED: 'EVALUATED',
                      EVALUATED: 'DEFENDED',
                      DEFENDED: 'PASSED',
                    }
                    setNewStatus(transitions[detail.status] || '')
                    setStatusDialogOpen(true)
                  }}
                  disabled={['PASSED', 'FAILED'].includes(detail.status)}
                >
                  <ChevronDown className="size-4 mr-1.5" />
                  Advance Status
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ==================== CREATE PROJECT DIALOG ==================== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New FYP Project</DialogTitle>
            <DialogDescription>Create a new final year project proposal</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="proj-title">Title *</Label>
              <Input id="proj-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proj-desc">Description *</Label>
              <Textarea id="proj-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Project description..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Semester *</Label>
                <Select value={form.semesterId} onValueChange={(v) => setForm({ ...form, semesterId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                  <SelectContent>
                    {semesterList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Supervisor *</Label>
                <Select value={form.supervisorId} onValueChange={(v) => setForm({ ...form, supervisorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                  <SelectContent>
                    {facultyList.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Co-Supervisor (optional)</Label>
              <Select value={form.coSupervisorId} onValueChange={(v) => setForm({ ...form, coSupervisorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select co-supervisor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {facultyList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proj-domain">Domain</Label>
              <Input id="proj-domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="e.g. Artificial Intelligence, Blockchain" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proj-method">Methodology</Label>
              <Textarea id="proj-method" value={form.methodology} onChange={(e) => setForm({ ...form, methodology: e.target.value })} placeholder="Development methodology..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD MEMBER DIALOG ==================== */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Select a student to add to this project</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Student *</Label>
              <Select value={memberForm.studentId} onValueChange={(v) => setMemberForm({ ...memberForm, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {studentList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={memberForm.role} onValueChange={(v) => setMemberForm({ ...memberForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEADER">Leader</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!memberForm.studentId || !selectedProjectId) return
                addMemberMutation.mutate({
                  projectId: selectedProjectId,
                  body: memberForm,
                })
              }}
              disabled={addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD MILESTONE DIALOG ==================== */}
      <Dialog open={addMilestoneOpen} onOpenChange={setAddMilestoneOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>Define a new project milestone</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} placeholder="Milestone title" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} placeholder="Description..." rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Due Date *</Label>
              <Input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMilestoneOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!milestoneForm.title || !milestoneForm.dueDate || !selectedProjectId) return
                addMilestoneMutation.mutate({
                  projectId: selectedProjectId,
                  body: milestoneForm,
                })
              }}
              disabled={addMilestoneMutation.isPending}
            >
              {addMilestoneMutation.isPending ? 'Adding...' : 'Add Milestone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== ADD EVALUATION DIALOG ==================== */}
      <Dialog open={addEvaluationOpen} onOpenChange={setAddEvaluationOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit Evaluation</DialogTitle>
            <DialogDescription>Record an evaluation for this project</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Evaluation Type *</Label>
              <Select value={evalForm.evaluationType} onValueChange={(v) => setEvalForm({ ...evalForm, evaluationType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPOSAL">Proposal</SelectItem>
                  <SelectItem value="MID">Mid-Term</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="EXTERNAL">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Evaluator *</Label>
              <Select value={evalForm.evaluatorId} onValueChange={(v) => setEvalForm({ ...evalForm, evaluatorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select evaluator" /></SelectTrigger>
                <SelectContent>
                  {facultyList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Total Score</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={evalForm.totalScore}
                onChange={(e) => setEvalForm({ ...evalForm, totalScore: e.target.value })}
                placeholder="0-100"
              />
            </div>
            <div className="grid gap-2">
              <Label>Comments</Label>
              <Textarea
                value={evalForm.comments}
                onChange={(e) => setEvalForm({ ...evalForm, comments: e.target.value })}
                placeholder="Evaluation comments..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEvaluationOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!evalForm.evaluatorId || !selectedProjectId) return
                addEvaluationMutation.mutate({
                  projectId: selectedProjectId,
                  body: evalForm,
                })
              }}
              disabled={addEvaluationMutation.isPending}
            >
              {addEvaluationMutation.isPending ? 'Submitting...' : 'Submit Evaluation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== STATUS UPDATE DIALOG ==================== */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Project Status</DialogTitle>
            <DialogDescription>
              Change status from <strong>{detail?.status ? getStatusLabel(detail.status) : ''}</strong> to <strong>{getStatusLabel(newStatus)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (!selectedProjectId || !newStatus) return
                updateStatusMutation.mutate({ id: selectedProjectId, status: newStatus })
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE CONFIRM ==================== */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently delete this project and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!deleteId) return
                fetch(`/api/projects/${deleteId}`, { method: 'DELETE' }).then((r) => r.json()).then((res) => {
                  if (res.success) {
                    toast.success('Project deleted')
                    setDeleteOpen(false)
                    setDeleteId(null)
                    queryClient.invalidateQueries({ queryKey: ['projects'] })
                    queryClient.invalidateQueries({ queryKey: ['project-stats'] })
                  } else {
                    toast.error(res.error || 'Failed to delete')
                  }
                })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
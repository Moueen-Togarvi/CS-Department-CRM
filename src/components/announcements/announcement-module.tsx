'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  Megaphone,
  Calendar,
  MapPin,
  Filter,
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
import { Switch } from '@/components/ui/switch'
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
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

// Types
interface Announcement {
  id: string
  title: string
  content: string
  type: string
  priority: number
  targetAudience: string
  eventDate: string | null
  eventLocation: string | null
  isPublished: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdByName: string
  createdAt: string
  isRead?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  EVENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  SEMINAR: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  NOTICE: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  GENERAL: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'All',
  STUDENTS: 'Students',
  FACULTY: 'Faculty',
  STAFF: 'Staff',
  'FACULTY,STUDENT': 'Faculty & Students',
}

const ANNOUNCEMENT_TYPES = ['ALL', 'URGENT', 'EVENT', 'SEMINAR', 'NOTICE', 'GENERAL']
const AUDIENCE_OPTIONS = ['ALL', 'STUDENTS', 'FACULTY', 'STAFF']

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function truncate(str: string, len: number) {
  if (str.length <= len) return str
  return str.slice(0, len) + '…'
}

export function AnnouncementModule() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterAudience, setFilterAudience] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [showFilters, setShowFilters] = useState(false)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Announcement | null>(null)

  // Form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'GENERAL',
    priority: 1,
    targetAudience: 'ALL',
    targetSemester: '',
    targetSection: '',
    eventDate: '',
    eventLocation: '',
    isPublished: true,
    expiresAt: '',
  })

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(pageSize))
    if (filterType !== 'ALL') params.set('type', filterType)
    if (filterAudience !== 'ALL') params.set('targetAudience', filterAudience)
    if (filterStatus !== 'ALL') params.set('isPublished', filterStatus)
    return params.toString()
  }, [page, pageSize, filterType, filterAudience, filterStatus])

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['announcements', queryParams],
    queryFn: () => fetch(`/api/announcements?${queryParams}`).then((r) => r.json()),
  })

  const announcements = data?.data || []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages || 1

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) =>
      fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Announcement created')
        setFormOpen(false)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['announcements'] })
      } else {
        toast.error(res.error || 'Failed to create')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Announcement updated')
        setFormOpen(false)
        setEditingItem(null)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['announcements'] })
      } else {
        toast.error(res.error || 'Failed to update')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/announcements/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Announcement deleted')
        setDeleteOpen(false)
        setSelectedId(null)
        queryClient.invalidateQueries({ queryKey: ['announcements'] })
      } else {
        toast.error(res.error || 'Failed to delete')
      }
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/announcements/${id}/read`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })

  const detailQuery = useQuery({
    queryKey: ['announcement', selectedId],
    queryFn: () =>
      selectedId ? fetch(`/api/announcements/${selectedId}`).then((r) => r.json()) : null,
    enabled: !!selectedId && detailOpen,
  })
  const detail = detailQuery.data?.data

  function resetForm() {
    setForm({
      title: '',
      content: '',
      type: 'GENERAL',
      priority: 1,
      targetAudience: 'ALL',
      targetSemester: '',
      targetSection: '',
      eventDate: '',
      eventLocation: '',
      isPublished: true,
      expiresAt: '',
    })
  }

  function openCreate() {
    resetForm()
    setEditingItem(null)
    setFormOpen(true)
  }

  function openEdit(item: Announcement) {
    setEditingItem(item)
    setForm({
      title: item.title,
      content: item.content,
      type: item.type,
      priority: item.priority,
      targetAudience: item.targetAudience,
      targetSemester: (item as any).targetSemester ? String((item as any).targetSemester) : '',
      targetSection: (item as any).targetSection || '',
      eventDate: item.eventDate ? item.eventDate.slice(0, 16) : '',
      eventLocation: item.eventLocation || '',
      isPublished: item.isPublished,
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 16) : '',
    })
    setFormOpen(true)
  }

  function openDetail(id: string) {
    setSelectedId(id)
    setDetailOpen(true)
    if (!isAdmin) {
      markReadMutation.mutate(id)
    }
  }

  function handleDelete(id: string) {
    setSelectedId(id)
    setDeleteOpen(true)
  }

  function handleSubmit() {
    if (!form.title || !form.content) {
      toast.error('Title and content are required')
      return
    }
    const body = {
      ...form,
      priority: Number(form.priority),
      targetSemester: form.targetSemester ? Number(form.targetSemester) : undefined,
      targetSection: form.targetSection || undefined,
      eventDate: form.eventDate || undefined,
      eventLocation: form.eventLocation || undefined,
      expiresAt: form.expiresAt || undefined,
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, body })
    } else {
      createMutation.mutate(body)
    }
  }

  const hasFilters = filterType !== 'ALL' || filterAudience !== 'ALL' || filterStatus !== 'ALL'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Create and manage department announcements and notices"
        actions={
          isAdmin ? (
            <Button onClick={openCreate} size="sm">
              <Plus className="size-4 mr-1.5" />
              New Announcement
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-0.5">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="size-4 mr-1.5" />
            Filters
            {hasFilters && (
              <span className="ml-1.5 size-2 rounded-full bg-emerald-500" />
            )}
          </Button>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => {
                setFilterType('ALL')
                setFilterAudience('ALL')
                setFilterStatus('ALL')
              }}
            >
              <X className="size-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1) }}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {ANNOUNCEMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === 'ALL' ? 'All Types' : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAudience} onValueChange={(v) => { setFilterAudience(v); setPage(1) }}>
            <SelectTrigger>
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a === 'ALL' ? 'All Audiences' : a.charAt(0) + a.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="true">Published</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {announcements.map((item: Announcement) => (
            <Card
              key={item.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openDetail(item.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className={TYPE_COLORS[item.type] || TYPE_COLORS.GENERAL}>
                    {item.type}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(item.id) }}>
                        <Eye className="size-4 mr-2" /> View
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(item) }}>
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-base leading-tight mt-2">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {truncate(item.content, 150)}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                  {item.eventDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(item.eventDate)}
                    </span>
                  )}
                  {item.eventLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {item.eventLocation}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    By {item.createdByName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {AUDIENCE_LABELS[item.targetAudience] || item.targetAudience}
                    </Badge>
                    {!item.isPublished && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Audience</TableHead>
                <TableHead className="hidden sm:table-cell">Priority</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((item: Announcement) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => openDetail(item.id)}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="truncate">{item.title}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className={TYPE_COLORS[item.type] || TYPE_COLORS.GENERAL}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {AUDIENCE_LABELS[item.targetAudience] || item.targetAudience}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{item.priority}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isPublished ? 'default' : 'outline'}>
                      {item.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(item.id) }}>
                        <Eye className="size-4 mr-2" /> View
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(item) }}>
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && announcements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No announcements found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Try adjusting your filters or create a new announcement
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update announcement details' : 'Create a new department announcement'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Announcement content..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="NOTICE">Notice</SelectItem>
                    <SelectItem value="EVENT">Event</SelectItem>
                    <SelectItem value="SEMINAR">Seminar</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Target Audience</Label>
              <Select value={form.targetAudience} onValueChange={(v) => setForm({ ...form, targetAudience: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="STUDENTS">Students</SelectItem>
                  <SelectItem value="FACULTY">Faculty</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.targetAudience === 'STUDENTS' && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/30">
                <div className="grid gap-2">
                  <Label>Target Semester (optional)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={form.targetSemester}
                    onChange={(e) => setForm({ ...form, targetSemester: e.target.value })}
                    placeholder="e.g. 3"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Target Section (optional)</Label>
                  <Input
                    value={form.targetSection}
                    onChange={(e) => setForm({ ...form, targetSection: e.target.value })}
                    placeholder="e.g. A"
                  />
                </div>
              </div>
            )}

            {form.type === 'EVENT' && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/30">
                <div className="grid gap-2">
                  <Label>Event Date</Label>
                  <Input
                    type="datetime-local"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Event Location</Label>
                  <Input
                    value={form.eventLocation}
                    onChange={(e) => setForm({ ...form, eventLocation: e.target.value })}
                    placeholder="e.g. Seminar Hall"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="publish">Publish immediately</Label>
              <Switch
                id="publish"
                checked={form.isPublished}
                onCheckedChange={(checked) => setForm({ ...form, isPublished: checked })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {detail && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className={TYPE_COLORS[detail.type] || TYPE_COLORS.GENERAL}>
                    {detail.type}
                  </Badge>
                  <Badge variant={detail.isPublished ? 'default' : 'outline'}>
                    {detail.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription>
                  By {detail.createdByName} &middot; {formatDate(detail.createdAt)}
                </DialogDescription>
              </>
            )}
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{detail.content}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <span className="ml-2 font-medium">{detail.priority}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Audience:</span>
                  <span className="ml-2 font-medium">{AUDIENCE_LABELS[detail.targetAudience] || detail.targetAudience}</span>
                </div>
                {detail.eventDate && (
                  <div>
                    <span className="text-muted-foreground">Event Date:</span>
                    <span className="ml-2 font-medium">{formatDate(detail.eventDate)}</span>
                  </div>
                )}
                {detail.eventLocation && (
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <span className="ml-2 font-medium">{detail.eventLocation}</span>
                  </div>
                )}
                {detail.expiresAt && (
                  <div>
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="ml-2 font-medium">{formatDate(detail.expiresAt)}</span>
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setDetailOpen(false); openEdit(detail as unknown as Announcement) }}>
                    <Pencil className="size-4 mr-1.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 dark:text-red-400"
                    onClick={() => { setDetailOpen(false); handleDelete(detail.id) }}
                  >
                    <Trash2 className="size-4 mr-1.5" /> Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedId && deleteMutation.mutate(selectedId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
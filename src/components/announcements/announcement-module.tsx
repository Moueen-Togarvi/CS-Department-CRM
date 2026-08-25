'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatDate } from '@/lib/utils'
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
  AlertTriangle,
  CalendarDays,
  Presentation,
  Bell,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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

// Tinted header band for the card view — gives the title its own visually
// separate area at the top of the card, distinct from the body below.
const TYPE_HEADER_BG: Record<string, string> = {
  URGENT: 'bg-red-50 dark:bg-red-950/20',
  EVENT: 'bg-emerald-50 dark:bg-emerald-950/20',
  SEMINAR: 'bg-amber-50 dark:bg-amber-950/20',
  NOTICE: 'bg-slate-50 dark:bg-slate-900/40',
  GENERAL: 'bg-gray-50 dark:bg-gray-900/40',
}

const TYPE_ICON_COLOR: Record<string, string> = {
  URGENT: 'text-red-600 dark:text-red-400',
  EVENT: 'text-emerald-600 dark:text-emerald-400',
  SEMINAR: 'text-amber-600 dark:text-amber-400',
  NOTICE: 'text-slate-600 dark:text-slate-400',
  GENERAL: 'text-gray-600 dark:text-gray-400',
}

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  URGENT: AlertTriangle,
  EVENT: CalendarDays,
  SEMINAR: Presentation,
  NOTICE: Bell,
  GENERAL: Megaphone,
}

// Poster-style gradient for the card grid — one hue family per type, same
// composition as the reference (gradient panel, white icon badge overlapping
// a white content panel, decorative corner texture).
const TYPE_POSTER_GRADIENT: Record<string, string> = {
  URGENT: 'linear-gradient(160deg, #FB7185 0%, #E11D48 55%, #9F1239 100%)',
  EVENT: 'linear-gradient(160deg, #6EE7B7 0%, #10B981 55%, #047857 100%)',
  SEMINAR: 'linear-gradient(160deg, #FCD34D 0%, #F59E0B 55%, #B45309 100%)',
  NOTICE: 'linear-gradient(160deg, #94A3B8 0%, #475569 55%, #1E293B 100%)',
  GENERAL: 'linear-gradient(160deg, #7FA6FF 0%, #3D6BFF 55%, #1F3FBE 100%)',
}

const TYPE_ICON_BADGE_COLOR: Record<string, string> = {
  URGENT: '#E11D48',
  EVENT: '#059669',
  SEMINAR: '#B45309',
  NOTICE: '#475569',
  GENERAL: '#2A4FDB',
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


function truncate(str: string, len: number) {
  if (str.length <= len) return str
  return str.slice(0, len) + '…'
}

/** Small decorative megaphone silhouette for the poster-style card's gradient corners. */
function MegaphoneAccent({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      className={cn('pointer-events-none', flip && 'scale-x-[-1]')}
      aria-hidden="true"
    >
      <g opacity="0.5" fill="#ffffff">
        <rect x="7" y="21" width="8" height="7" rx="2"></rect>
        <path d="M15 15 L34 6 C36 5 38 7 37.5 9 L34 27 C33.5 29 31 29.5 29.5 28 L15 23 Z"></path>
      </g>
    </svg>
  )
}

/** Faint dotted-grid corner texture, matching the reference poster's background pattern. */
function CornerGridAccent({ uid, flip = false }: { uid: string; flip?: boolean }) {
  const dotsId = `posterGridDots-${uid}`
  const fadeId = `posterGridFade-${uid}`
  const maskId = `posterGridMask-${uid}`
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      className={cn('pointer-events-none', flip && 'scale-x-[-1]')}
      aria-hidden="true"
    >
      <defs>
        <pattern id={dotsId} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#ffffff"></circle>
        </pattern>
        <linearGradient id={fadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5"></stop>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"></stop>
        </linearGradient>
        <mask id={maskId}>
          <rect width="80" height="80" fill={`url(#${fadeId})`}></rect>
        </mask>
      </defs>
      <rect width="80" height="80" fill={`url(#${dotsId})`} mask={`url(#${maskId})`}></rect>
    </svg>
  )
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
    // Keep the URL in sync so a Share link reopens this exact announcement.
    const url = new URL(window.location.href)
    url.searchParams.set('id', id)
    window.history.replaceState(null, '', url.toString())
  }

  function closeDetail() {
    setDetailOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('id')
    window.history.replaceState(null, '', url.toString())
  }

  // Open straight to an announcement when the page is loaded via a shared
  // link (?id=...). Runs once — openDetail's own replaceState keeps the URL
  // in sync from then on.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (id) openDetail(id)
  }, [])

  async function handleShare(item: { id: string; title: string; content: string }) {
    const url = new URL(window.location.href)
    url.searchParams.set('id', item.id)
    const shareUrl = url.toString()

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: item.title, text: truncate(item.content, 120), url: shareUrl })
      } catch (err) {
        // The user closing the native share sheet is not an error.
        if ((err as Error)?.name !== 'AbortError') toast.error('Could not share this announcement')
      }
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy link')
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-0 p-0 shadow-md">
              <Skeleton className="h-24 w-full rounded-none" />
              <div className="-mt-6 rounded-t-2xl bg-card px-5 pt-8 pb-4 text-center">
                <Skeleton className="mx-auto h-5 w-2/3 mb-2" />
                <Skeleton className="mx-auto h-4 w-full mb-1" />
                <Skeleton className="mx-auto h-4 w-4/5" />
              </div>
            </Card>
          ))}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {announcements.map((item: Announcement) => {
            const TypeIcon = TYPE_ICONS[item.type] || TYPE_ICONS.GENERAL
            const gradient = TYPE_POSTER_GRADIENT[item.type] || TYPE_POSTER_GRADIENT.GENERAL
            const badgeColor = TYPE_ICON_BADGE_COLOR[item.type] || TYPE_ICON_BADGE_COLOR.GENERAL
            return (
              <Card
                key={item.id}
                className="group cursor-pointer overflow-hidden border-0 p-0 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl"
                onClick={() => openDetail(item.id)}
              >
                {/* Poster-style gradient panel — mirrors the reference: a
                    colored panel with corner texture, capped by a white
                    content panel that overlaps a badge circle. */}
                <div className="relative overflow-hidden px-4 pt-4 pb-9" style={{ background: gradient }}>
                  <div className="pointer-events-none absolute -left-2 -top-2 opacity-90">
                    <CornerGridAccent uid={item.id} />
                  </div>
                  <div className="pointer-events-none absolute -right-2 -top-2 opacity-90">
                    <CornerGridAccent uid={`${item.id}-r`} flip />
                  </div>
                  <div className="pointer-events-none absolute -left-1 bottom-4">
                    <MegaphoneAccent />
                  </div>
                  <div className="pointer-events-none absolute -right-1 bottom-4">
                    <MegaphoneAccent flip />
                  </div>

                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-800">
                        {item.type}
                      </span>
                      {!item.isPublished && (
                        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          Draft
                        </span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 rounded-full bg-white/20 text-white opacity-0 hover:bg-white/30 hover:text-white group-hover:opacity-100"
                        >
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
                </div>

                {/* White content panel — pulled up over the gradient panel,
                    with the icon badge straddling the seam like the reference. */}
                <div className="relative z-10 -mt-6 rounded-t-2xl bg-card px-5 pt-8 pb-4 text-center shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.12)]">
                  <div
                    className="absolute -top-6 left-1/2 flex size-12 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-md"
                    style={{ color: badgeColor }}
                  >
                    <TypeIcon className="size-5" />
                  </div>

                  <h3 className="text-base font-extrabold uppercase tracking-tight text-foreground line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground line-clamp-3">
                    {truncate(item.content, 140)}
                  </p>

                  {(item.eventDate || item.eventLocation) && (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                  )}

                  <div className="mt-4 flex items-center justify-center gap-2 border-t pt-3 text-xs">
                    <span className="font-bold tracking-wide text-muted-foreground">
                      BY {item.createdByName.toUpperCase()}
                    </span>
                    <span className="text-muted-foreground/40">&middot;</span>
                    <Badge variant="outline" className="text-[10px]">
                      {AUDIENCE_LABELS[item.targetAudience] || item.targetAudience}
                    </Badge>
                  </div>
                </div>
              </Card>
            )
          })}
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
      <Dialog open={detailOpen} onOpenChange={(open) => (open ? setDetailOpen(true) : closeDetail())}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-0 p-0">
          {detail ? (
            <>
              {/* Title band — same tinted-header treatment as the card view,
                  so the detail view reads as the same design. */}
              <div
                className={cn(
                  'rounded-t-lg border-b px-6 py-4',
                  TYPE_HEADER_BG[detail.type] || TYPE_HEADER_BG.GENERAL
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    {(() => {
                      const TypeIcon = TYPE_ICONS[detail.type] || TYPE_ICONS.GENERAL
                      return (
                        <div
                          className={cn(
                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background/80',
                            TYPE_ICON_COLOR[detail.type] || TYPE_ICON_COLOR.GENERAL
                          )}
                        >
                          <TypeIcon className="size-3.5" />
                        </div>
                      )
                    })()}
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <Badge variant="secondary" className={TYPE_COLORS[detail.type] || TYPE_COLORS.GENERAL}>
                          {detail.type}
                        </Badge>
                        <Badge variant={detail.isPublished ? 'default' : 'outline'}>
                          {detail.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                      <DialogTitle className="text-base leading-snug">{detail.title}</DialogTitle>
                      <DialogDescription className="mt-0.5">
                        By {detail.createdByName} &middot; {formatDate(detail.createdAt)}
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-8 shrink-0 bg-background/80"
                    onClick={() => handleShare(detail)}
                  >
                    <Share2 className="size-3.5 mr-1.5" /> Share
                  </Button>
                </div>
              </div>

              <div className="space-y-4 px-6 py-4">
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
                    <Button variant="outline" size="sm" onClick={() => { closeDetail(); openEdit(detail as unknown as Announcement) }}>
                      <Pencil className="size-4 mr-1.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 dark:text-red-400"
                      onClick={() => { closeDetail(); handleDelete(detail.id) }}
                    >
                      <Trash2 className="size-4 mr-1.5" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            detailQuery.isFetched && (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
                <Megaphone className="size-8 text-muted-foreground/40" />
                This announcement is no longer available.
              </div>
            )
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
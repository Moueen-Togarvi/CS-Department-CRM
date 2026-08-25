'use client'

import { useState, useMemo } from 'react'
import { formatDate } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Download,
  Search,
  FolderOpen,
  File,
  X,
  GraduationCap,
  BookOpen,
  Calendar,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Upload, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

interface Document {
  id: string
  title: string
  description: string | null
  category: string
  courseId: string | null
  courseName: string | null
  courseCode: string | null
  semesterNumber: number | null
  facultyId: string | null
  facultyName: string | null
  facultyDesignation: string | null
  fileUrl: string
  fileType: string | null
  fileSize: number | null
  downloadCount: number
  uploadedByName: string
  createdAt: string
}

interface Course {
  id: string
  code: string
  name: string
}

interface Faculty {
  id: string
  designation: string
  user: { id: string; name: string }
}

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]

const CATEGORY_COLORS: Record<string, string> = {
  SYLLABUS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  NOTES: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ASSIGNMENT: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  PAPER: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  REFERENCE: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

const CATEGORY_ICONS: Record<string, string> = {
  SYLLABUS: '📋',
  NOTES: '📝',
  ASSIGNMENT: '📋',
  PAPER: '📄',
  REFERENCE: '📚',
  OTHER: '📎',
}

const CATEGORY_LABELS: Record<string, string> = {
  SYLLABUS: 'Syllabus',
  NOTES: 'Notes',
  ASSIGNMENT: 'Assignment',
  PAPER: 'Past Papers',
  REFERENCE: 'Reference',
  OTHER: 'Other',
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}


export function DocumentModule() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [filterCourse, setFilterCourse] = useState<string>('ALL')
  const [filterSemester, setFilterSemester] = useState<string>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [dcSearch, setDcSearch] = useState('')
  const [dcSemester, setDcSemester] = useState<string>('ALL')
  const [dcCourse, setDcCourse] = useState<string>('ALL')

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Document | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    courseId: '',
    semesterNumber: '' as string,
    facultyId: '',
    fileUrl: '',
  })
  const [uploading, setUploading] = useState(false)

  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === 'ADMIN' || user?.role === 'FACULTY'

  const { data: coursesData } = useQuery({
    queryKey: ['courses-select'],
    queryFn: () => fetch('/api/courses').then((r) => r.json()),
  })
  const courses: Course[] = coursesData?.data || []

  const { data: facultyData } = useQuery({
    queryKey: ['faculty-select'],
    queryFn: () => fetch('/api/faculty?limit=100').then((r) => r.json()),
  })
  const faculty: Faculty[] = facultyData?.data || []

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(pageSize))
    if (filterCourse !== 'ALL') params.set('courseId', filterCourse)
    if (filterSemester !== 'ALL') params.set('semesterNumber', filterSemester)
    if (filterCategory !== 'ALL') params.set('category', filterCategory)
    if (searchQuery) params.set('search', searchQuery)
    return params.toString()
  }, [page, pageSize, filterCourse, filterSemester, filterCategory, searchQuery])

  const { data, isLoading } = useQuery({
    queryKey: ['documents', queryParams],
    queryFn: () => fetch(`/api/documents?${queryParams}`).then((r) => r.json()),
  })

  const dcQueryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (dcSemester !== 'ALL') params.set('semesterNumber', dcSemester)
    if (dcCourse !== 'ALL') params.set('courseId', dcCourse)
    if (dcSearch) params.set('search', dcSearch)
    return params.toString()
  }, [dcSemester, dcCourse, dcSearch])

  const { data: downloadCenterData, isLoading: dcLoading } = useQuery({
    queryKey: ['download-center', dcQueryParams],
    queryFn: () => fetch(`/api/documents/download-center?${dcQueryParams}`).then((r) => r.json()),
  })

  const documents = data?.data || []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages || 1
  const groupedDocs: Record<string, Document[]> = downloadCenterData?.data || {}

  const createMutation = useMutation({
    mutationFn: (body: any) =>
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Document uploaded')
        setFormOpen(false)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['documents'] })
        queryClient.invalidateQueries({ queryKey: ['download-center'] })
      } else {
        toast.error(res.error || 'Failed to upload')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Document updated')
        setFormOpen(false)
        setEditingItem(null)
        resetForm()
        queryClient.invalidateQueries({ queryKey: ['documents'] })
        queryClient.invalidateQueries({ queryKey: ['download-center'] })
      } else {
        toast.error(res.error || 'Failed to update')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/documents/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Document deleted')
        setDeleteOpen(false)
        setSelectedId(null)
        queryClient.invalidateQueries({ queryKey: ['documents'] })
        queryClient.invalidateQueries({ queryKey: ['download-center'] })
      } else {
        toast.error(res.error || 'Failed to delete')
      }
    },
  })

  function resetForm() {
    setForm({ title: '', description: '', category: 'OTHER', courseId: '', semesterNumber: '', facultyId: '', fileUrl: '' })
  }

  async function handleFileUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.url) {
        setForm((prev) => ({
          ...prev,
          fileUrl: json.url,
          title: prev.title || file.name.replace(/\.[^.]+$/, ''),
        }))
        toast.success('File uploaded')
      } else {
        toast.error(json.error || 'Upload failed')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function openCreate() {
    resetForm()
    setEditingItem(null)
    setFormOpen(true)
  }

  function openEdit(item: Document) {
    setEditingItem(item)
    setForm({
      title: item.title,
      description: item.description || '',
      category: item.category,
      courseId: item.courseId || '',
      semesterNumber: item.semesterNumber ? String(item.semesterNumber) : '',
      facultyId: item.facultyId || '',
      fileUrl: item.fileUrl,
    })
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    setSelectedId(id)
    setDeleteOpen(true)
  }

  function handleSubmit() {
    if (!form.title || !form.fileUrl) {
      toast.error('Title and File URL are required')
      return
    }
    if (!form.courseId || form.courseId === 'none') {
      toast.error('Please select a course')
      return
    }
    if (!form.semesterNumber) {
      toast.error('Please select a semester')
      return
    }
    const body = {
      ...form,
      courseId: form.courseId !== 'none' ? form.courseId : undefined,
      semesterNumber: Number(form.semesterNumber),
      facultyId: form.facultyId || undefined,
      description: form.description || undefined,
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, body })
    } else {
      createMutation.mutate(body)
    }
  }

  const categoryOrder = ['SYLLABUS', 'NOTES', 'ASSIGNMENT', 'PAPER', 'REFERENCE', 'OTHER']
  const activeCategories = categoryOrder.filter((cat) => groupedDocs[cat]?.length > 0)
  const totalDcDocs = activeCategories.reduce((sum, cat) => sum + groupedDocs[cat].length, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Upload, organize, and share department documents"
        actions={
          canManage ? (
            <Button onClick={openCreate} size="sm">
              <Plus className="size-4 mr-1.5" />
              Upload Document
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue={canManage ? 'all' : 'download-center'} className="space-y-4">
        <TabsList>
          {canManage && (
            <TabsTrigger value="all">
              <FileText className="size-4 mr-1.5" />
              All Documents
            </TabsTrigger>
          )}
          <TabsTrigger value="download-center">
            <FolderOpen className="size-4 mr-1.5" />
            Download Center
          </TabsTrigger>
        </TabsList>

        {canManage && (
          <TabsContent value="all" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filterSemester} onValueChange={(v) => { setFilterSemester(v); setPage(1) }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Semesters</SelectItem>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCourse} onValueChange={(v) => { setFilterCourse(v); setPage(1) }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1) }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="SYLLABUS">Syllabus</SelectItem>
                    <SelectItem value="NOTES">Notes</SelectItem>
                    <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                    <SelectItem value="PAPER">Paper</SelectItem>
                    <SelectItem value="REFERENCE">Reference</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {(filterCourse !== 'ALL' || filterSemester !== 'ALL' || filterCategory !== 'ALL' || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFilterCourse('ALL'); setFilterSemester('ALL'); setFilterCategory('ALL'); setSearchQuery(''); setPage(1) }}
                  >
                    <X className="size-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {['Title', 'Category', 'Course', 'Uploaded By', 'Type', 'Size', 'Downloads', 'Date', ''].map((h, i) => (
                        <TableHead key={i}><Skeleton className="h-4 w-16" /></TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full max-w-[100px]" /></TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="hidden md:table-cell">Course</TableHead>
                      <TableHead className="hidden lg:table-cell">Faculty</TableHead>
                      <TableHead className="hidden lg:table-cell">Uploaded By</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="hidden md:table-cell">Size</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: Document) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <File className="size-4 text-muted-foreground shrink-0" />
                            <div>
                              <div className="font-medium text-sm truncate max-w-[200px]">{doc.title}</div>
                              {doc.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.description}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className={CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.OTHER}>
                            {doc.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {doc.courseCode ? `${doc.courseCode}` : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {doc.facultyName || '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {doc.uploadedByName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {doc.fileType?.toUpperCase() || '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(doc.fileUrl, '_blank')}>
                                <Download className="size-4 mr-2" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(doc)}>
                                <Pencil className="size-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => handleDelete(doc.id)}
                              >
                                <Trash2 className="size-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!isLoading && documents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="size-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No documents found</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Upload a document or adjust your filters
                </p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* Download Center Tab */}
        <TabsContent value="download-center" className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={dcSearch}
                onChange={(e) => setDcSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={dcSemester} onValueChange={setDcSemester}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Semesters</SelectItem>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dcCourse} onValueChange={setDcCourse}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(dcSemester !== 'ALL' || dcCourse !== 'ALL' || dcSearch) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDcSemester('ALL'); setDcCourse('ALL'); setDcSearch('') }}
                >
                  <X className="size-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Download Center Cards */}
          {dcLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <Skeleton key={j} className="h-28 w-full rounded-lg" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : totalDcDocs === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="size-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No documents found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeCategories.map((category) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CATEGORY_ICONS[category] || '📎'}</span>
                      <CardTitle className="text-base">{CATEGORY_LABELS[category] || category}</CardTitle>
                      <Badge variant="secondary" className="ml-auto">
                        {groupedDocs[category].length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {groupedDocs[category].map((doc: Document) => (
                        <div
                          key={doc.id}
                          className="group flex flex-col gap-2 rounded-xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex size-8 items-center justify-center rounded-lg bg-muted shrink-0">
                                <File className="size-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium text-sm truncate">{doc.title}</span>
                            </div>
                            {doc.fileType && (
                              <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                                {doc.fileType}
                              </Badge>
                            )}
                          </div>

                          {doc.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{doc.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {doc.semesterNumber && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="size-3" />
                                Sem {doc.semesterNumber}
                              </span>
                            )}
                            {doc.courseCode && (
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="size-3" />
                                {doc.courseCode}
                              </span>
                            )}
                            {doc.facultyName && (
                              <span className="inline-flex items-center gap-1">
                                <GraduationCap className="size-3" />
                                {doc.facultyName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 mt-auto">
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatFileSize(doc.fileSize)}
                            </span>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => window.open(doc.fileUrl, '_blank')}
                            >
                              <Download className="size-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Document' : 'Upload Document'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update document metadata' : 'Add a new document to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="doc-title">Title *</Label>
              <Input
                id="doc-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Document title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-desc">Description</Label>
              <Textarea
                id="doc-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Semester *</Label>
                <Select value={form.semesterNumber} onValueChange={(v) => setForm({ ...form, semesterNumber: v })}>
                  <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Course *</Label>
                <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Faculty (Teacher)</Label>
                <Select value={form.facultyId} onValueChange={(v) => setForm({ ...form, facultyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>
                    {faculty.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.user.name}{f.designation ? ` (${f.designation})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SYLLABUS">Syllabus</SelectItem>
                    <SelectItem value="NOTES">Notes</SelectItem>
                    <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                    <SelectItem value="PAPER">Past Paper</SelectItem>
                    <SelectItem value="REFERENCE">Reference</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>File *</Label>
              {form.fileUrl ? (
                <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
                  <File className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-sm text-slate-600 truncate flex-1">{form.fileUrl.split('/').pop()}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setForm({ ...form, fileUrl: '' })}>
                    <X className="size-3 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-6 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                  {uploading ? (
                    <>
                      <Loader2 className="size-5 animate-spin text-emerald-600" />
                      <span className="text-xs text-slate-500">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-5 text-slate-400" />
                      <span className="text-xs text-slate-500">Click to select a file</span>
                      <span className="text-[10px] text-slate-400">PDF, DOCX, PPTX, etc.</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingItem ? 'Update' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
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

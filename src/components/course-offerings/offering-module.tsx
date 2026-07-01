'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, AlertCircle,
  Search, Users, BookOpen,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Offering {
  id: string
  courseId: string
  facultyId: string
  semesterId: string
  section: string
  slotType: string
  isActive: boolean
  course: { id: string; code: string; name: string; creditHours: number; courseType: string; semesterOffered: number | null }
  faculty: { id: string; facultyId: string; name: string; designation: string; maxCoursesPerSemester: number } | null
  semester: { id: string; name: string; isCurrent: boolean }
  studentCount: number
}

interface FacultyOption { id: string; facultyId: string; designation: string; user: { name: string }; maxCoursesPerSemester: number }
interface CourseOption { id: string; code: string; name: string; semesterOffered: number | null }
interface SemesterOption { id: string; name: string; isCurrent: boolean }

const SLOT_COLOR: Record<string, string> = {
  THEORY: 'bg-emerald-50 text-emerald-600',
  LAB: 'bg-violet-50 text-violet-600',
  PROJECT: 'bg-amber-50 text-amber-600',
}

export function CourseOfferingModule() {
  const queryClient = useQueryClient()
  const [filterSemester, setFilterSemester] = useState('')
  const [filterFaculty, setFilterFaculty] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null)
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({ courseId: '', facultyId: '', semesterId: '', section: 'A', slotType: 'THEORY' })
  const [editForm, setEditForm] = useState({ facultyId: '', section: 'A', slotType: 'THEORY' })

  const { data: offerings = [], isLoading } = useQuery<Offering[]>({
    queryKey: ['course-offerings', filterSemester, filterFaculty],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (filterSemester) p.set('semesterId', filterSemester)
      if (filterFaculty !== 'ALL') p.set('facultyId', filterFaculty)
      const res = await fetch('/api/course-offerings?' + p.toString())
      return (await res.json()).data || []
    },
  })
  const { data: semesters = [] } = useQuery<SemesterOption[]>({ queryKey: ['semesters'], queryFn: async () => (await (await fetch('/api/semesters')).json()).data || [] })
  const { data: facultyList = [] } = useQuery<FacultyOption[]>({ queryKey: ['faculty-list'], queryFn: async () => (await (await fetch('/api/faculty?limit=100')).json()).data || [] })
  const { data: courseList = [] } = useQuery<CourseOption[]>({ queryKey: ['courses-active'], queryFn: async () => (await (await fetch('/api/courses?limit=200')).json()).data || [] })

  const currentSemester = useMemo(() => semesters.find((s) => s.isCurrent) || semesters[0], [semesters])
  const effectiveSemesterId = filterSemester || currentSemester?.id || ''

  const facultyLoad = useMemo(() => {
    const m: Record<string, number> = {}
    offerings.forEach((o) => { if (o.facultyId) m[o.facultyId] = (m[o.facultyId] || 0) + 1 })
    return m
  }, [offerings])

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => fetch('/api/course-offerings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (res) => { if (res.success) { toast.success('Assigned'); setAssignOpen(false); setForm({ courseId: '', facultyId: '', semesterId: effectiveSemesterId, section: 'A', slotType: 'THEORY' }); queryClient.invalidateQueries({ queryKey: ['course-offerings'] }) } else toast.error(res.error || 'Failed') },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: typeof editForm }) => fetch(`/api/course-offerings/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (res) => { if (res.success) { toast.success('Updated'); setEditOpen(false); setSelectedOffering(null); queryClient.invalidateQueries({ queryKey: ['course-offerings'] }) } else toast.error(res.error || 'Failed') },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/course-offerings/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (res) => { if (res.success) { toast.success('Removed'); setRemoveOpen(false); setSelectedOffering(null); queryClient.invalidateQueries({ queryKey: ['course-offerings'] }) } else toast.error(res.error || 'Failed') },
  })

  const openAssign = () => { setForm({ courseId: '', facultyId: '', semesterId: effectiveSemesterId, section: 'A', slotType: 'THEORY' }); setAssignOpen(true) }
  const openEdit = (o: Offering) => { setSelectedOffering(o); setEditForm({ facultyId: o.facultyId, section: o.section, slotType: o.slotType }); setEditOpen(true) }

  const filtered = useMemo(() => offerings.filter((o) => {
    if (!o.isActive) return false
    if (searchQuery) { const q = searchQuery.toLowerCase(); return o.course.code.toLowerCase().includes(q) || o.course.name.toLowerCase().includes(q) || (o.faculty?.name || '').toLowerCase().includes(q) }
    return true
  }), [offerings, searchQuery])

  const grouped = useMemo(() => {
    const m: Record<string, { course: Offering['course']; items: Offering[] }> = {}
    filtered.forEach((o) => { const k = o.course.code; if (!m[k]) m[k] = { course: o.course, items: [] }; m[k].items.push(o) })
    return Object.values(m).sort((a, b) => a.course.code.localeCompare(b.course.code))
  }, [filtered])

  const assignedIds = useMemo(() => new Set(filtered.map((o) => o.courseId)), [filtered])
  const unassigned = useMemo(() => courseList.filter((c) => !assignedIds.has(c.id)), [courseList, assignedIds])

  const toggleCourse = (code: string) => setCollapsedCourses((p) => { const n = new Set(p); n.has(code) ? n.delete(code) : n.add(code); return n })

  return (
    <div className="space-y-5">
      <PageHeader title="Course Assignments" description="Assign courses to faculty each semester."
        actions={<Button onClick={openAssign} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"><Plus className="size-4" /> Assign Course</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search course or faculty..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={effectiveSemesterId} onValueChange={setFilterSemester}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Semester" /></SelectTrigger>
            <SelectContent>{semesters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.isCurrent && ' (Current)'}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterFaculty} onValueChange={setFilterFaculty}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All faculty" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All Faculty</SelectItem>{facultyList.map((f) => <SelectItem key={f.id} value={f.id}>{f.user.name}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-xs text-slate-400 self-center px-1">{filtered.length} assignments</span>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl">
          <BookOpen className="size-10 text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No assignments yet</p>
          <Button onClick={openAssign} size="sm" variant="outline" className="mt-3">Assign first course</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ course, items }) => {
            const collapsed = collapsedCourses.has(course.code)
            return (
              <Card key={course.id} className="border-slate-200 shadow-sm overflow-hidden">
                <button onClick={() => toggleCourse(course.code)} className="w-full flex items-center gap-2.5 p-3 hover:bg-slate-50/50 transition-colors text-left">
                  {collapsed ? <ChevronRight className="size-4 text-slate-400 shrink-0" /> : <ChevronDown className="size-4 text-slate-400 shrink-0" />}
                  <span className="font-semibold text-sm text-slate-800 shrink-0">{course.code}</span>
                  <span className="text-xs text-slate-400 truncate flex-1">{course.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{items.length} sec</Badge>
                </button>
                {!collapsed && (
                  <div className="divide-y divide-slate-50">
                    {items.map((o) => {
                      const load = o.facultyId ? (facultyLoad[o.facultyId] || 0) : 0
                      const max = o.faculty?.maxCoursesPerSemester || 3
                      return (
                        <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 group hover:bg-slate-50/30">
                          {/* Section badge */}
                          <div className="flex items-center gap-1.5 shrink-0 w-20">
                            <span className="size-6 rounded bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-600">{o.section}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SLOT_COLOR[o.slotType] || SLOT_COLOR.THEORY}`}>{o.slotType}</span>
                          </div>
                          {/* Faculty */}
                          <div className="flex-1 min-w-0">
                            {o.faculty ? (
                              <span className="text-sm text-slate-700 truncate block">{o.faculty.name}</span>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Unassigned</span>
                            )}
                          </div>
                          {/* Students */}
                          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400 shrink-0">
                            <Users className="size-3" /> {o.studentCount}
                          </span>
                          {/* Load */}
                          {o.faculty && (
                            <span className={`hidden md:block text-[10px] font-medium shrink-0 ${load >= max ? 'text-red-500' : load >= max - 1 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {load}/{max}
                            </span>
                          )}
                          {/* Actions */}
                          <div className="flex gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="size-7 text-slate-400 hover:text-slate-700" onClick={() => openEdit(o)}><Pencil className="size-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="size-7 text-slate-400 hover:text-red-600" onClick={() => { setSelectedOffering(o); setRemoveOpen(true) }}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}

          {/* Unassigned hint */}
          {unassigned.length > 0 && !searchQuery && (
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="size-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-700">{unassigned.length} course{unassigned.length !== 1 ? 's' : ''} without faculty</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.slice(0, 12).map((c) => (
                  <button key={c.id} onClick={() => { setForm({ courseId: c.id, facultyId: '', semesterId: effectiveSemesterId, section: 'A', slotType: 'THEORY' }); setAssignOpen(true) }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-amber-200 text-[11px] text-slate-600 hover:border-amber-400 hover:bg-amber-50/50 transition-colors">
                    <Plus className="size-2.5 text-amber-500" /> {c.code}
                  </button>
                ))}
                {unassigned.length > 12 && <span className="text-[11px] text-slate-400 self-center">+{unassigned.length - 12} more</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Course</DialogTitle><DialogDescription>Select course, faculty, and section.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-600">Semester</Label>
              <Select value={form.semesterId} onValueChange={(v) => setForm({ ...form, semesterId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{semesters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.isCurrent && ' (Current)'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-600">Course</Label>
              <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">{courseList.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-600">Faculty</Label>
              <Select value={form.facultyId} onValueChange={(v) => setForm({ ...form, facultyId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">{facultyList.map((f) => { const l = facultyLoad[f.id] || 0; return <SelectItem key={f.id} value={f.id}>{f.user.name} ({l}/{f.maxCoursesPerSemester})</SelectItem> })}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-600">Section</Label>
                <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['A', 'B', 'C', 'D'].map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-600">Type</Label>
                <Select value={form.slotType} onValueChange={(v) => setForm({ ...form, slotType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="THEORY">Theory</SelectItem><SelectItem value="LAB">Lab</SelectItem><SelectItem value="PROJECT">Project</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!form.courseId || !form.facultyId || !form.semesterId) { toast.error('All fields required'); return }; createMutation.mutate(form) }} disabled={createMutation.isPending} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">{createMutation.isPending ? 'Assigning...' : 'Assign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Assignment</DialogTitle><DialogDescription>{selectedOffering && <>{selectedOffering.course.code} — {selectedOffering.course.name}</>}</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-600">Faculty</Label>
              <Select value={editForm.facultyId} onValueChange={(v) => setEditForm({ ...editForm, facultyId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[200px]">{facultyList.map((f) => <SelectItem key={f.id} value={f.id}>{f.user.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-600">Section</Label>
                <Select value={editForm.section} onValueChange={(v) => setEditForm({ ...editForm, section: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['A', 'B', 'C', 'D'].map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-600">Type</Label>
                <Select value={editForm.slotType} onValueChange={(v) => setEditForm({ ...editForm, slotType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="THEORY">Theory</SelectItem><SelectItem value="LAB">Lab</SelectItem><SelectItem value="PROJECT">Project</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => selectedOffering && updateMutation.mutate({ id: selectedOffering.id, body: editForm })} disabled={updateMutation.isPending} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">{updateMutation.isPending ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove Assignment</AlertDialogTitle><AlertDialogDescription>Remove <b>{selectedOffering?.course.code}</b> (Sec {selectedOffering?.section}) from <b>{selectedOffering?.faculty?.name || 'faculty'}</b>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => selectedOffering && removeMutation.mutate(selectedOffering.id)} disabled={removeMutation.isPending}>{removeMutation.isPending ? 'Removing...' : 'Remove'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

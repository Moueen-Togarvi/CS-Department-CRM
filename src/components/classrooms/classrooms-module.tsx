'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, MapPin, ArrowLeft, ArrowRight, Building2, MoreVertical, School, Users, GraduationCap, Loader2
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Eye } from 'lucide-react'

// Import RoomsModule
import { RoomsModule } from '@/components/rooms/rooms-module'

// Reusable components and types from StudentModule
import { StudentDetailPanel, type StudentRow, type StudentStats, type StudentDetail } from '@/components/students/student-module'
import type { ColumnDef, SortingState } from '@tanstack/react-table'

export function ClassroomsModule() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const queryClient = useQueryClient()

  // Tabs state
  const [activeTab, setActiveTab] = useState<'classes' | 'rooms'>('classes')

  // Classes View states
  const [selectedGroup, setSelectedGroup] = useState<{ semester: number; section: string } | null>(null)
  const [cardSemesterFilter, setCardSemesterFilter] = useState('all')
  const [cardShiftFilter, setCardShiftFilter] = useState('all')
  
  // Student List under a class states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([])

  // Assign Room/Floor states
  const [assignRoomClass, setAssignRoomClass] = useState<{ semester: number; section: string; room?: string; floor?: number | null } | null>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('custom')
  const [customRoomName, setCustomRoomName] = useState<string>('')
  const [customFloor, setCustomFloor] = useState<string>('')
  const [isSavingRoom, setIsSavingRoom] = useState(false)

  // Student Detail Sheet state
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // Load rooms and prefill state
  useEffect(() => {
    if (assignRoomClass) {
      fetch('/api/rooms')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setRooms(res.data)
            const matchedRoom = res.data.find((r: any) => r.name === assignRoomClass.room)
            if (matchedRoom) {
              setSelectedRoomId(matchedRoom.id)
              setCustomRoomName(matchedRoom.name)
              setCustomFloor(String(matchedRoom.floor !== null && matchedRoom.floor !== undefined ? matchedRoom.floor : ''))
            } else {
              setSelectedRoomId('custom')
              setCustomRoomName(assignRoomClass.room && assignRoomClass.room !== 'N/A' ? assignRoomClass.room : '')
              setCustomFloor(assignRoomClass.floor !== null && assignRoomClass.floor !== undefined ? String(assignRoomClass.floor) : '')
            }
          }
        })
    }
  }, [assignRoomClass])

  // Queries
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

  // Build query string for student list scoped to selectedGroup
  const queryString = useMemo(() => {
    if (!selectedGroup) return ''
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(pageSize))
    params.set('semester', String(selectedGroup.semester))
    params.set('section', selectedGroup.section)
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (sorting.length > 0) {
      params.set('sort', sorting[0].id)
      params.set('order', sorting[0].desc ? 'desc' : 'asc')
    }
    return params.toString()
  }, [selectedGroup, page, pageSize, search, statusFilter, sorting])

  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-class-list', queryString],
    queryFn: () => fetch(`/api/students?${queryString}`).then((r) => r.json()),
    enabled: !!selectedGroup,
  })

  const { data: studentDetail, isLoading: detailLoading } = useQuery<{
    success: boolean
    data: StudentDetail
  }>({
    queryKey: ['student', selectedStudentId],
    queryFn: () => fetch(`/api/students/${selectedStudentId}`).then((r) => r.json()),
    enabled: !!selectedStudentId,
  })

  const handleSaveRoom = async () => {
    if (!assignRoomClass) return
    setIsSavingRoom(true)
    try {
      const res = await fetch('/api/students/class-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: assignRoomClass.semester,
          section: assignRoomClass.section,
          room: customRoomName.trim() || null,
          floor: customFloor ? parseInt(customFloor) : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Classroom assignment updated successfully')
        queryClient.invalidateQueries({ queryKey: ['students', 'stats'] })
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

  const openDetail = useCallback((student: StudentRow) => {
    setSelectedStudentId(student.id)
    setDetailOpen(true)
  }, [])

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
            return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">Active</Badge>
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
                  <MoreVertical className="size-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(student) }}>
                  <Eye className="size-4 mr-2" /> View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [openDetail]
  )

  const students = studentsData?.data || []
  const pagination = studentsData?.pagination

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classrooms"
        description="View class directories, semester sections, and manage lecture halls & lab assignments."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 max-w-[400px]">
          <TabsTrigger value="classes" className="font-semibold gap-2">
            <School className="size-4" /> Class Sections
          </TabsTrigger>
          <TabsTrigger value="rooms" className="font-semibold gap-2">
            <Building2 className="size-4" /> Facility Rooms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-6 space-y-6">
          {selectedGroup === null ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3.5">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-base font-bold tracking-tight text-foreground">Academic Class Cards</h2>
                    <p className="text-[11px] text-muted-foreground">Select a section card to manage students and allocate rooms</p>
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
                          return true
                        })

                      if (filtered.length === 0) {
                        return (
                          <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20">
                            <School className="size-10 text-muted-foreground/30 mb-2" />
                            <p className="text-sm font-medium text-muted-foreground">No sections match filter criteria</p>
                          </div>
                        )
                      }

                      const getProgramName = (sec: string) => {
                        if (!sec) return 'BS CS'
                        const upper = sec.toUpperCase()
                        if (upper.includes('CS')) return 'BS CS'
                        if (upper.includes('SE')) return 'BS SE'
                        if (upper.includes('IT')) return 'BS IT'
                        if (upper.includes('DS')) return 'BS DS'
                        if (upper.includes('AI')) return 'BS AI'
                        if (upper.includes('MCS')) return 'MCS'
                        if (upper.includes('MS')) return 'MS CS'
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
                              setSearch('')
                              setStatusFilter('all')
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
                                          room: item.room || undefined,
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
                      <School className="size-10 text-muted-foreground/30 mb-2" />
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
                  onClick={() => setSelectedGroup(null)}
                  className="h-8 gap-1.5"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Cards</span>
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div>
                  <h2 className="text-base font-semibold tracking-tight">
                    Semester {selectedGroup.semester} - Section {selectedGroup.section}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Showing student directory for Semester {selectedGroup.semester}, Section {selectedGroup.section}
                  </p>
                </div>
              </div>

              {/* Scoped Filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students in class..."
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
                    isLoading={isLoadingStudents}
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
        </TabsContent>

        <TabsContent value="rooms" className="mt-6">
          <RoomsModule />
        </TabsContent>
      </Tabs>

      {/* Assign Room & Floor Dialog */}
      <Dialog open={!!assignRoomClass} onOpenChange={(open) => !open && setAssignRoomClass(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
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
              className="font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveRoom}
              disabled={isSavingRoom}
            >
              {isSavingRoom ? 'Saving...' : 'Save Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}

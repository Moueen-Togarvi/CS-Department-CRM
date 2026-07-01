'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Trash2, Pencil, Building2,
  MoreVertical, DoorOpen, FlaskConical,
  Presentation, Briefcase,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { ROOM_TYPES, type CreateRoomInput, type UpdateRoomInput } from '@/lib/validators/room'

interface Room {
  id: string
  name: string
  building: string
  floor: number | null
  capacity: number
  roomType: 'CLASSROOM' | 'LAB' | 'SEMINAR_HALL' | 'OFFICE'
  hasProjector: boolean
  hasAC: boolean
  isAvailable: boolean
}

const TYPE_ICON: Record<string, any> = {
  CLASSROOM: DoorOpen,
  LAB: FlaskConical,
  SEMINAR_HALL: Presentation,
  OFFICE: Briefcase,
}

const TYPE_LABEL: Record<string, string> = {
  CLASSROOM: 'Classroom',
  LAB: 'Lab',
  SEMINAR_HALL: 'Seminar Hall',
  OFFICE: 'Office',
}

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  CLASSROOM: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'text-emerald-700 dark:text-emerald-400',
  },
  LAB: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
    label: 'text-violet-700 dark:text-violet-400',
  },
  SEMINAR_HALL: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'text-amber-700 dark:text-amber-400',
  },
  OFFICE: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'text-blue-700 dark:text-blue-400',
  },
}

export function RoomsModule() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [filterBuilding, setFilterBuilding] = useState('ALL')
  const [filterAvailability, setFilterAvailability] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const [form, setForm] = useState({
    name: '', building: '', floor: '', capacity: '30',
    roomType: 'CLASSROOM' as Room['roomType'], hasProjector: false, hasAC: false, isAvailable: true,
  })

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => fetch('/api/rooms').then((r) => r.json().then((res) => res.data || [])),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateRoomInput) => fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (res) => { if (res.success) { toast.success('Room created'); setFormOpen(false); queryClient.invalidateQueries({ queryKey: ['rooms'] }) } else toast.error(res.error || 'Failed') },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoomInput }) => fetch(`/api/rooms/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (res) => { if (res.success) { toast.success('Room updated'); setFormOpen(false); setSelectedRoom(null); queryClient.invalidateQueries({ queryKey: ['rooms'] }) } else toast.error(res.error || 'Failed') },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/rooms/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (res) => { if (res.success) { toast.success('Room deleted'); setDeleteOpen(false); setSelectedRoom(null); queryClient.invalidateQueries({ queryKey: ['rooms'] }) } else toast.error(res.error || 'Failed') },
  })

  const resetForm = () => setForm({ name: '', building: '', floor: '', capacity: '30', roomType: 'CLASSROOM', hasProjector: false, hasAC: false, isAvailable: true })
  const openCreate = () => { resetForm(); setSelectedRoom(null); setFormOpen(true) }
  const openEdit = (room: Room) => {
    setSelectedRoom(room)
    setForm({ name: room.name, building: room.building, floor: room.floor !== null ? String(room.floor) : '', capacity: String(room.capacity), roomType: room.roomType, hasProjector: room.hasProjector, hasAC: room.hasAC, isAvailable: room.isAvailable })
    setFormOpen(true)
  }

  const handleSubmit = () => {
    if (!form.name || !form.building) { toast.error('Name and building required'); return }
    const payload = { name: form.name.trim(), building: form.building.trim(), floor: form.floor ? parseInt(form.floor) : null, capacity: parseInt(form.capacity) || 30, roomType: form.roomType, hasProjector: form.hasProjector, hasAC: form.hasAC, isAvailable: form.isAvailable }
    if (selectedRoom) updateMutation.mutate({ id: selectedRoom.id, body: payload })
    else createMutation.mutate(payload)
  }

  const buildingOptions = useMemo(() => Array.from(new Set(rooms.map((r) => r.building))).sort(), [rooms])
  const filtered = useMemo(() => rooms.filter((r) => {
    const s = r.name.toLowerCase().includes(search.toLowerCase()) || r.building.toLowerCase().includes(search.toLowerCase())
    return s && (filterType === 'ALL' || r.roomType === filterType) && (filterBuilding === 'ALL' || r.building === filterBuilding) && (filterAvailability === 'ALL' || (filterAvailability === 'AVAILABLE' && r.isAvailable) || (filterAvailability === 'UNAVAILABLE' && !r.isAvailable))
  }), [rooms, search, filterType, filterBuilding, filterAvailability])

  return (
    <div className="space-y-5">
      <PageHeader title="Room Management" description="Manage classrooms, labs, and facilities."
        actions={<Button onClick={openCreate} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"><Plus className="size-4" /> Add Room</Button>}
      />

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search rooms..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All Types</SelectItem>{ROOM_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t] || t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterBuilding} onValueChange={setFilterBuilding}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Building" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All Buildings</SelectItem>{buildingOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterAvailability} onValueChange={setFilterAvailability}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All</SelectItem><SelectItem value="AVAILABLE">Available</SelectItem><SelectItem value="UNAVAILABLE">Unavailable</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-[84px] rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl">
          <DoorOpen className="size-10 text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No rooms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((room) => {
            const TypeIcon = TYPE_ICON[room.roomType] || DoorOpen
            const style = TYPE_STYLE[room.roomType] || TYPE_STYLE.CLASSROOM
            return (
              <Card
                key={room.id}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-xl cursor-pointer group"
                onClick={() => openEdit(room)}
              >
                  <div className="p-3 flex flex-col justify-between h-[84px] relative">
                    {/* Absolute 3-dot menu at top right */}
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button onClick={(e) => e.stopPropagation()} className="size-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(room) }}><Pencil className="size-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); setDeleteOpen(true) }}><Trash2 className="size-3.5 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Top row: name and icon with spacing */}
                    <div className="flex items-center gap-3 min-w-0 pr-6">
                      <div className={`size-8.5 rounded-lg ${style.bg} flex items-center justify-center shrink-0`}>
                        <TypeIcon className={`size-4.5 ${style.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-extrabold text-slate-950 dark:text-white truncate leading-none">{room.name}</p>
                        <p className={`text-[10px] ${style.label} font-extrabold tracking-wider mt-1`}>{TYPE_LABEL[room.roomType].toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Location Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-800 dark:text-slate-200 font-extrabold bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md w-full justify-between mt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="size-3.5 text-slate-500 shrink-0" />
                        <span className="whitespace-nowrap overflow-hidden">{room.building}</span>
                      </div>
                      {room.floor !== null && <span className="text-slate-400 font-normal shrink-0">· Fl {room.floor}</span>}
                    </div>
                  </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
            <DialogDescription>{selectedRoom ? 'Update room details.' : 'Register a new room.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-600">Room Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. LAB-1, Room 102" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-600">Building *</Label>
                <Input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="Main Block" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-600">Floor</Label>
                <Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="1" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-600">Type</Label>
              <Select value={form.roomType} onValueChange={(v) => setForm({ ...form, roomType: v as Room['roomType'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CLASSROOM">Classroom</SelectItem><SelectItem value="LAB">Lab</SelectItem><SelectItem value="SEMINAR_HALL">Seminar Hall</SelectItem><SelectItem value="OFFICE">Office</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Room</AlertDialogTitle><AlertDialogDescription>Delete <b>{selectedRoom?.name}</b>? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => selectedRoom && deleteMutation.mutate(selectedRoom.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Building,
  Users,
  Monitor,
  Wind,
  CheckCircle,
  XCircle,
  MoreVertical,
  DoorOpen,
  Sparkles,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

export function RoomsModule() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterBuilding, setFilterBuilding] = useState<string>('ALL')
  const [filterAvailability, setFilterAvailability] = useState<string>('ALL')

  // Dialog State
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  // Form Fields
  const [form, setForm] = useState({
    name: '',
    building: '',
    floor: '',
    capacity: '30',
    roomType: 'CLASSROOM' as Room['roomType'],
    hasProjector: false,
    hasAC: false,
    isAvailable: true,
  })

  // Queries
  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => fetch('/api/rooms').then((r) => r.json().then((res) => res.data || [])),
  })

  // Mutation for creating a room
  const createMutation = useMutation({
    mutationFn: (body: CreateRoomInput) =>
      fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Room created successfully')
        setFormOpen(false)
        queryClient.invalidateQueries({ queryKey: ['rooms'] })
      } else {
        toast.error(res.error || 'Failed to create room')
      }
    },
  })

  // Mutation for updating a room
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoomInput }) =>
      fetch(`/api/rooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Room updated successfully')
        setFormOpen(false)
        setSelectedRoom(null)
        queryClient.invalidateQueries({ queryKey: ['rooms'] })
      } else {
        toast.error(res.error || 'Failed to update room')
      }
    },
  })

  // Mutation for deleting a room
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/rooms/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Room deleted successfully')
        setDeleteOpen(false)
        setSelectedRoom(null)
        queryClient.invalidateQueries({ queryKey: ['rooms'] })
      } else {
        toast.error(res.error || 'Failed to delete room')
      }
    },
  })

  const resetForm = () => {
    setForm({
      name: '',
      building: '',
      floor: '',
      capacity: '30',
      roomType: 'CLASSROOM',
      hasProjector: false,
      hasAC: false,
      isAvailable: true,
    })
  }

  const openCreate = () => {
    resetForm()
    setSelectedRoom(null)
    setFormOpen(true)
  }

  const openEdit = (room: Room) => {
    setSelectedRoom(room)
    setForm({
      name: room.name,
      building: room.building,
      floor: room.floor !== null ? String(room.floor) : '',
      capacity: String(room.capacity),
      roomType: room.roomType,
      hasProjector: room.hasProjector,
      hasAC: room.hasAC,
      isAvailable: room.isAvailable,
    })
    setFormOpen(true)
  }

  const openDelete = (room: Room) => {
    setSelectedRoom(room)
    setDeleteOpen(true)
  }

  const handleSubmit = () => {
    if (!form.name || !form.building) {
      toast.error('Room name and building are required')
      return
    }

    const payload = {
      name: form.name.trim(),
      building: form.building.trim(),
      floor: form.floor ? parseInt(form.floor) : null,
      capacity: parseInt(form.capacity) || 30,
      roomType: form.roomType,
      hasProjector: form.hasProjector,
      hasAC: form.hasAC,
      isAvailable: form.isAvailable,
    }

    if (selectedRoom) {
      updateMutation.mutate({ id: selectedRoom.id, body: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // Derived filter categories for building selector
  const buildingOptions = useMemo(() => {
    const set = new Set(rooms.map((r) => r.building))
    return Array.from(set).sort()
  }, [rooms])

  // Filter & Search Logic
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchSearch =
        room.name.toLowerCase().includes(search.toLowerCase()) ||
        room.building.toLowerCase().includes(search.toLowerCase())
      
      const matchType = filterType === 'ALL' || room.roomType === filterType
      const matchBuilding = filterBuilding === 'ALL' || room.building === filterBuilding
      const matchAvailability =
        filterAvailability === 'ALL' ||
        (filterAvailability === 'AVAILABLE' && room.isAvailable) ||
        (filterAvailability === 'UNAVAILABLE' && !room.isAvailable)

      return matchSearch && matchType && matchBuilding && matchAvailability
    })
  }, [rooms, search, filterType, filterBuilding, filterAvailability])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Room Management"
        description="Configure class rooms, labs, and seminar halls for timetable assignments."
        actions={
          <Button onClick={openCreate} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
            <Plus className="size-4" />
            Add Room
          </Button>
        }
      />

      {/* Toolbar & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or building..."
            className="pl-9 bg-white border-slate-200 focus-visible:ring-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[140px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {ROOM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <Select value={filterBuilding} onValueChange={setFilterBuilding}>
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder="Building" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Buildings</SelectItem>
                {buildingOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <Select value={filterAvailability} onValueChange={setFilterAvailability}>
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid of Room Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-slate-100 shadow-sm animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-1/2 bg-slate-200 rounded mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full bg-slate-200 rounded" />
                <div className="h-4 w-5/6 bg-slate-200 rounded" />
                <div className="h-8 w-full bg-slate-200 rounded mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl bg-slate-50/20">
          <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <DoorOpen className="size-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">No Rooms Found</h3>
          <p className="text-sm text-slate-505 max-w-sm text-center mt-1">
            Try adjusting your search query, changing filters, or add a new room to the system.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className="group border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <CardHeader className="pb-3 bg-slate-50/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {room.name}
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Building className="size-3 shrink-0" />
                        {room.building} {room.floor !== null && `(Floor ${room.floor})`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 hover:bg-slate-100 rounded-full shrink-0">
                            <MoreVertical className="size-3.5 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(room)} className="text-xs font-medium cursor-pointer">
                            <Pencil className="size-3.5 mr-2" /> Edit Room
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDelete(room)}
                            className="text-xs font-medium text-red-650 dark:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="size-3.5 mr-2" /> Delete Room
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Capacity & Type */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Users className="size-3.5 text-slate-400" /> Capacity
                    </span>
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {room.capacity} students
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-505">Room Type</span>
                    <Badge variant="outline" className="text-[10px] font-semibold tracking-wider text-slate-600">
                      {room.roomType}
                    </Badge>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {room.hasProjector && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 flex items-center gap-1 text-[10px]">
                        <Monitor className="size-3 shrink-0" /> Projector
                      </Badge>
                    )}
                    {room.hasAC && (
                      <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 hover:bg-cyan-50 border-0 flex items-center gap-1 text-[10px]">
                        <Wind className="size-3 shrink-0" /> AC
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </div>

              {/* Status footer banner */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs mt-auto">
                <span className="text-slate-500">Status</span>
                <span className="flex items-center gap-1 font-medium">
                  {room.isAvailable ? (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle className="size-3.5 text-emerald-500" /> Available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-700">
                      <XCircle className="size-3.5 text-rose-500" /> Booked / Inactive
                    </span>
                  )}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-500" />
              {selectedRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
            <DialogDescription>
              {selectedRoom
                ? 'Modify the details of this room in the catalog.'
                : 'Fill in the information below to register a room for the department.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs font-semibold text-slate-600">
                Room Name / Number *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. LAB-1, 102, seminar-hall"
                className="focus-visible:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="building" className="text-xs font-semibold text-slate-600">
                  Building *
                </Label>
                <Input
                  id="building"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                  placeholder="e.g. Main Block, CS Dept"
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="floor" className="text-xs font-semibold text-slate-600">
                  Floor
                </Label>
                <Input
                  id="floor"
                  type="number"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="e.g. 1"
                  className="focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="capacity" className="text-xs font-semibold text-slate-600">
                  Student Capacity *
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="30"
                  className="focus-visible:ring-emerald-500"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-slate-600">Room Type</Label>
                <Select
                  value={form.roomType}
                  onValueChange={(v) => setForm({ ...form, roomType: v as Room['roomType'] })}
                >
                  <SelectTrigger className="focus-visible:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLASSROOM">Classroom</SelectItem>
                    <SelectItem value="LAB">Lab</SelectItem>
                    <SelectItem value="SEMINAR_HALL">Seminar Hall</SelectItem>
                    <SelectItem value="OFFICE">Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Switch Amenities */}
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-3">
              <h4 className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Amenities & Status
              </h4>

              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="projector" className="cursor-pointer text-slate-600">
                  Has Projector
                </Label>
                <Switch
                  id="projector"
                  checked={form.hasProjector}
                  onCheckedChange={(checked) => setForm({ ...form, hasProjector: checked })}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="ac" className="cursor-pointer text-slate-600">
                  Has Air Conditioner (AC)
                </Label>
                <Switch
                  id="ac"
                  checked={form.hasAC}
                  onCheckedChange={(checked) => setForm({ ...form, hasAC: checked })}
                />
              </div>

              <div className="flex items-center justify-between text-xs border-t pt-2.5 mt-1 border-slate-100">
                <Label htmlFor="available" className="cursor-pointer font-medium text-slate-700">
                  Is Available for Booking
                </Label>
                <Switch
                  id="available"
                  checked={form.isAvailable}
                  onCheckedChange={(checked) => setForm({ ...form, isAvailable: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-slate-800">{selectedRoom?.name}</span>? 
              This action is permanent and cannot be undone. Rooms assigned to existing timetables cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
              onClick={() => selectedRoom && deleteMutation.mutate(selectedRoom.id)}
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

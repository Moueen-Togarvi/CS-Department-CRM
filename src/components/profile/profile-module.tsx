'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Calendar,
  MapPin,
  UserCircle,
  Save,
  Hash,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Profile {
  id: string
  email: string
  name: string
  role: string
  avatar: string | null
  phone: string | null
  student: any
  faculty: any
}

export function ProfileModule() {
  const queryClient = useQueryClient()
  const authUser = useAuthStore((s) => s.user)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', avatar: '', address: '', mobileNumber: '' })

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await fetch('/api/users/me')
      const json = await res.json()
      return json.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: (body: typeof form) =>
      fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Profile updated')
        setEditing(false)
        queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      } else {
        toast.error(res.error || 'Failed to update')
      }
    },
  })

  const startEdit = () => {
    setForm({
      name: profile?.name || '',
      phone: profile?.phone || '',
      avatar: profile?.avatar || '',
      address: profile?.student?.address || '',
      mobileNumber: profile?.student?.mobileNumber || '',
    })
    setEditing(true)
  }

  const initials = (profile?.name || authUser?.name || '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const roleBadge = {
    ADMIN: 'bg-rose-50 text-rose-700',
    FACULTY: 'bg-violet-50 text-violet-700',
    STUDENT: 'bg-emerald-50 text-emerald-700',
  }[profile?.role || authUser?.role || 'STUDENT']

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Profile"
        description="View and update your personal information."
        actions={
          !editing ? (
            <Button onClick={startEdit} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Save className="size-4" /> Edit Profile
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-10 animate-pulse space-y-4">
            <div className="h-20 w-20 rounded-full bg-slate-200" />
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header card */}
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-emerald-500 to-emerald-700" />
            <CardContent className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                <Avatar className="size-24 border-4 border-white shadow-md">
                  <AvatarImage src={profile?.avatar || undefined} />
                  <AvatarFallback className="text-2xl font-bold bg-emerald-100 text-emerald-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-800">{profile?.name}</h2>
                    <Badge className={roleBadge + ' border-0'}>{profile?.role}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Mail className="size-3.5" /> {profile?.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit form */}
          {editing ? (
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">Edit Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Full Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  {profile?.role === 'STUDENT' && (
                    <>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Mobile Number</Label>
                        <Input value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Address</Label>
                        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                      </div>
                    </>
                  )}
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-600">Avatar URL</Label>
                    <Input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => updateMutation.mutate(form)}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile?.student && (
                <Card className="border-slate-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <GraduationCap className="size-4 text-emerald-600" /> Academic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-sm">
                    <InfoRow icon={Hash} label="Student ID" value={profile.student.studentId} />
                    <InfoRow icon={Award} label="Program" value={profile.student.program} />
                    <InfoRow icon={Calendar} label="Current Semester" value={`Semester ${profile.student.currentSemester}`} />
                    <InfoRow icon={Calendar} label="Enrollment Year" value={String(profile.student.enrollmentYear)} />
                    {profile.student.batch && <InfoRow icon={Hash} label="Batch" value={profile.student.batch} />}
                    {profile.student.gpa != null && <InfoRow icon={Award} label="CGPA" value={String(profile.student.gpa)} />}
                    {profile.student.section && <InfoRow icon={Hash} label="Section" value={profile.student.section} />}
                    {profile.student.department && (
                      <InfoRow icon={Building2} label="Department" value={`${profile.student.department.name} (${profile.student.department.code})`} />
                    )}
                  </CardContent>
                </Card>
              )}

              {profile?.faculty && (
                <Card className="border-slate-100 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <UserCircle className="size-4 text-emerald-600" /> Faculty Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-sm">
                    <InfoRow icon={Hash} label="Faculty ID" value={profile.faculty.facultyId} />
                    <InfoRow icon={Award} label="Designation" value={profile.faculty.designation} />
                    {profile.faculty.specialization && <InfoRow icon={Award} label="Specialization" value={profile.faculty.specialization} />}
                    {profile.faculty.highestDegree && <InfoRow icon={Award} label="Highest Degree" value={profile.faculty.highestDegree} />}
                    {profile.faculty.officeRoom && <InfoRow icon={MapPin} label="Office" value={profile.faculty.officeRoom} />}
                    {profile.faculty.department && (
                      <InfoRow icon={Building2} label="Department" value={`${profile.faculty.department.name} (${profile.faculty.department.code})`} />
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="border-slate-100 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Phone className="size-4 text-emerald-600" /> Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <InfoRow icon={Mail} label="Email" value={profile?.email} />
                  <InfoRow icon={Phone} label="Phone" value={profile?.phone || '—'} />
                  {profile?.student?.mobileNumber && <InfoRow icon={Phone} label="Mobile" value={profile.student.mobileNumber} />}
                  {profile?.student?.address && <InfoRow icon={MapPin} label="Address" value={profile.student.address} />}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 flex items-center gap-1.5">
        <Icon className="size-3.5 text-slate-400" /> {label}
      </span>
      <span className="font-medium text-slate-800 text-right truncate">{value || '—'}</span>
    </div>
  )
}

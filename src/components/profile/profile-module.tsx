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
  Clock,
  Eye,
  EyeOff,
  Upload,
  Loader2,
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
  isActive?: boolean
  lastLogin?: string | null
  student: any
  faculty: any
}

export function ProfileModule() {
  const queryClient = useQueryClient()
  const authUser = useAuthStore((s) => s.user)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    avatar: '',
    address: '',
    mobileNumber: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [uploading, setUploading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const json = await res.json()
      if (json.url) {
        setForm((prev) => ({ ...prev, avatar: json.url }))
        toast.success('Avatar uploaded successfully')
      } else {
        toast.error(json.error || 'Upload failed')
      }
    } catch (err) {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

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
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setShowOldPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setEditing(true)
  }

  const handleSave = () => {
    if (profile?.role === 'ADMIN' && form.newPassword) {
      if (!form.oldPassword) {
        toast.error('Please enter your current password')
        return
      }
      if (form.newPassword.length < 6) {
        toast.error('New password must be at least 6 characters')
        return
      }
      if (form.newPassword !== form.confirmPassword) {
        toast.error('New password and confirm password do not match')
        return
      }
    }
    updateMutation.mutate(form)
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
    <div className="space-y-6 max-w-5xl mx-auto py-2 animate-fade-in">
      <PageHeader
        title="My Profile"
        description="View your personal and academic information."
      />

      {isLoading ? (
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardContent className="p-10 animate-pulse space-y-4">
            <div className="h-20 w-20 rounded-full bg-slate-200" />
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Summary Card */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
              <CardContent className="pt-8 pb-6 px-6 text-center space-y-5">
                <Avatar className="size-28 border-2 border-slate-100 shadow-sm mx-auto">
                  <AvatarImage src={profile?.avatar || undefined} className="object-cover" />
                  <AvatarFallback className="text-3xl font-semibold bg-emerald-50 text-emerald-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{profile?.name}</h2>
                  <Badge className={roleBadge + ' border-0 px-2.5 py-0.5 text-xs font-medium'}>
                    {profile?.role === 'ADMIN' ? 'COORDINATOR' : profile?.role}
                  </Badge>
                </div>

                <div className="border-t border-slate-100 pt-4 text-left space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <Mail className="size-4 text-slate-400 shrink-0" />
                    <span className="truncate">{profile?.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="size-4 text-slate-400 shrink-0" />
                    <span>{profile?.phone || '—'}</span>
                  </div>
                </div>

                {profile?.role !== 'STUDENT' && !editing && (
                  <div className="pt-2">
                    <Button onClick={startEdit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium text-sm">
                      <Save className="size-4" /> Edit Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Details / Form */}
          <div className="md:col-span-2 space-y-6">
            {editing ? (
              <Card className="border-slate-200/80 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100/80">
                  <CardTitle className="text-base font-semibold text-slate-800">Edit Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Full Name</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-50/30 focus:bg-white" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Phone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-50/30 focus:bg-white" />
                    </div>

                    <div className="grid gap-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold text-slate-600">Profile Picture</Label>
                      <div className="flex items-center gap-4 mt-1">
                        <Avatar className="size-16 border border-slate-200">
                          <AvatarImage src={form.avatar || undefined} className="object-cover" />
                          <AvatarFallback className="text-lg font-bold bg-emerald-100 text-emerald-700">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1.5">
                          <label className="cursor-pointer">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                              {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                              {uploading ? 'Uploading...' : 'Upload Photo'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                              disabled={uploading}
                            />
                          </label>
                          <p className="text-[10px] text-slate-400">PNG, JPG or WEBP. Max 5MB.</p>
                        </div>
                      </div>
                    </div>

                    {profile?.role === 'ADMIN' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:col-span-2 border-t border-slate-100 pt-5 mt-2">
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Old Password</Label>
                          <div className="relative">
                            <Input
                              type={showOldPassword ? "text" : "password"}
                              value={form.oldPassword}
                              onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                              placeholder="Current password"
                              className="pr-10 bg-slate-50/30 focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOldPassword(!showOldPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-semibold text-slate-600">New Password</Label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              value={form.newPassword}
                              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                              placeholder="New password"
                              className="pr-10 bg-slate-50/30 focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-semibold text-slate-600">Confirm Password</Label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              value={form.confirmPassword}
                              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                              placeholder="Confirm new password"
                              className="pr-10 bg-slate-50/30 focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="text-slate-600 hover:bg-slate-50">Cancel</Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={handleSave}
                      disabled={updateMutation.isPending || uploading}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {profile?.role === 'ADMIN' && (
                  <InfoGroup title="Coordinator Information">
                    <InfoItem label="Full Name" value={profile.name} icon={UserCircle} />
                    <InfoItem label="Email" value={profile.email} icon={Mail} />
                    <InfoItem label="Role" value="System Coordinator" icon={Award} />
                    <InfoItem label="Status" value={profile.isActive ? 'Active' : 'Inactive'} icon={Clock} />
                    <InfoItem label="Last Login" value={profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : undefined} icon={Calendar} />
                  </InfoGroup>
                )}

                {profile?.student && (
                  <>
                    <InfoGroup title="Academic Information">
                      <InfoItem label="Student ID" value={profile.student.studentId} icon={Hash} />
                      <InfoItem label="Program" value={profile.student.program} icon={GraduationCap} />
                      <InfoItem label="Current Semester" value={profile.student.currentSemester != null ? `Semester ${profile.student.currentSemester}` : undefined} icon={Calendar} />
                      <InfoItem label="Enrollment Year" value={profile.student.enrollmentYear} icon={Calendar} />
                      <InfoItem label="Session" value={profile.student.session} icon={Calendar} />
                      <InfoItem label="Batch" value={profile.student.batch} icon={Hash} />
                      <InfoItem label="CGPA" value={profile.student.gpa} icon={Award} />
                      <InfoItem label="Section" value={profile.student.section} icon={Hash} />
                      <InfoItem label="Department" value={profile.student.department ? `${profile.student.department.name} (${profile.student.department.code})` : undefined} icon={Building2} />
                    </InfoGroup>

                    <InfoGroup title="Contact Details">
                      <InfoItem label="Mobile Number" value={profile.student.mobileNumber} icon={Phone} />
                      <InfoItem label="Address" value={profile.student.address} icon={MapPin} />
                    </InfoGroup>
                  </>
                )}

                {profile?.faculty && (
                  <>
                    <InfoGroup title="Academic & Department Details">
                      <InfoItem label="Faculty ID" value={profile.faculty.facultyId} icon={Hash} />
                      <InfoItem label="Designation" value={profile.faculty.designation} icon={Award} />
                      <InfoItem label="Specialization" value={profile.faculty.specialization} icon={Award} />
                      <InfoItem label="Highest Degree" value={profile.faculty.highestDegree} icon={Award} />
                      <InfoItem label="Office Room" value={profile.faculty.officeRoom} icon={MapPin} />
                      <InfoItem label="Office Hours" value={profile.faculty.officeHours} icon={Clock} />
                      <InfoItem label="Department" value={profile.faculty.department ? `${profile.faculty.department.name} (${profile.faculty.department.code})` : undefined} icon={Building2} />
                    </InfoGroup>

                    {profile.faculty.bio && (
                      <Card className="border-slate-200/80 shadow-sm bg-white">
                        <CardHeader className="pb-3 border-b border-slate-100/80">
                          <CardTitle className="text-sm font-semibold text-slate-800 tracking-tight">Biography</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 px-6 pb-6 text-sm text-slate-600 leading-relaxed">
                          {profile.faculty.bio}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-slate-200/80 shadow-sm bg-white">
      <CardHeader className="pb-3 border-b border-slate-100/80">
        <CardTitle className="text-sm font-semibold text-slate-800 tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

function InfoItem({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: any }) {
  return (
    <div className="flex justify-between items-center sm:items-start sm:flex-col gap-1 py-1">
      <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5 shrink-0 tracking-wide uppercase">
        {Icon && <Icon className="size-3.5 text-slate-400 shrink-0" />}
        {label}
      </span>
      <span className="font-semibold text-slate-800 break-words max-w-full text-right sm:text-left text-sm">
        {value !== undefined && value !== null && value !== '' ? String(value) : '—'}
      </span>
    </div>
  )
}

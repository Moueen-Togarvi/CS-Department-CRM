'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  GraduationCap,
  Users,
  Megaphone,
  CalendarDays,
  MapPin,
  Loader2,
  School,
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  CheckCircle,
  ClipboardList,
  Activity,
  CreditCard,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { useAuthStore } from '@/stores/auth-store'

// ==================== Helpers ====================

function getTypeBadge(type: string) {
  switch (type) {
    case 'URGENT': return <Badge variant="destructive">Urgent</Badge>
    case 'EVENT': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Event</Badge>
    case 'SEMINAR': return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Seminar</Badge>
    case 'NOTICE': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Notice</Badge>
    default: return <Badge variant="secondary">General</Badge>
  }
}

// ==================== Stat Card ====================

function StatCard({ title, value, subtitle, icon: Icon, iconColor, isLoading }: {
  title: string; value: number | string; subtitle?: string
  icon: React.ElementType; iconColor?: string; isLoading?: boolean
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColor || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isLoading ? (
          <div className="space-y-1">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StatCardsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCard key={i} title="Loading..." value="0" isLoading={true} icon={Activity} />
      ))}
    </>
  )
}

// ==================== Main ====================

export function DashboardModule() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role || 'STUDENT'

  if (role === 'ADMIN') return <AdminDashboard />
  if (role === 'FACULTY') return <FacultyDashboard />
  return <StudentDashboard />
}

// ==================== Admin Dashboard ====================

function AdminDashboard() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/overview')
      const json = await res.json()
      return json.data
    },
  })

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['dashboard-attendance-trend'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/charts/attendance-trend')
      const json = await res.json()
      return json.data || []
    },
  })

  const { data: recentAnnouncements } = useQuery({
    queryKey: ['dashboard-recent-announcements'],
    queryFn: async () => {
      const res = await fetch('/api/announcements?limit=5&sort=latest')
      const json = await res.json()
      return json.success ? json.data : []
    },
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-0 animate-fade-in">
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {isLoading ? <StatCardsSkeleton /> : (
          <>
            <StatCard title="Total Students" value={overview?.totalStudents ?? 0} subtitle="Currently enrolled" icon={Users} iconColor="text-emerald-500" />
            <StatCard title="Total Faculty" value={overview?.totalFaculty ?? 0} subtitle="Active members" icon={GraduationCap} iconColor="text-sky-500" />
            <StatCard title="Classrooms" value={overview?.totalRooms ?? 0} subtitle="Rooms & labs" icon={School} iconColor="text-amber-500" />
            <StatCard title="Announcements" value={overview?.totalAnnouncements ?? 0} subtitle="Published" icon={Megaphone} iconColor="text-rose-500" />
          </>
        )}
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Attendance Trend</CardTitle>
              <CardDescription>Average attendance rate per week.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="ml-auto gap-1 hidden sm:flex">
              View Report <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : attendanceData && attendanceData.length > 0 ? (
              <ChartContainer config={{ percentage: { label: 'Attendance %', color: 'var(--color-emerald-500)' } }} className="h-[300px] w-full">
                <LineChart data={attendanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value: any) => [`${value}%`, 'Attendance']} />} />
                  <Line type="monotone" dataKey="percentage" stroke="var(--color-percentage)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-percentage)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">No attendance data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
            <CardDescription>Latest department updates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {recentAnnouncements && recentAnnouncements.length > 0 ? (
              recentAnnouncements.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted">
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">{item.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.content}</p>
                  </div>
                  <div className="ml-auto font-medium text-xs whitespace-nowrap">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No announcements yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== Faculty Dashboard ====================

function FacultyDashboard() {
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }, [])

  const weekdayName = useMemo(() => {
    if (!selectedDate) return ''
    const d = new Date(selectedDate)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' })
  }, [selectedDate])

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null
      const res = await fetch(`/api/dashboard/overview?date=${selectedDate}`)
      const json = await res.json()
      return json.data
    },
    enabled: !!selectedDate,
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-0 animate-fade-in">
      <PageHeader title="Dashboard" description="Your teaching overview" />

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {isLoading ? <StatCardsSkeleton /> : (
          <>
            <StatCard title="My Courses" value={data?.courseCount ?? 0} subtitle="Assigned this semester" icon={BookOpen} iconColor="text-emerald-500" />
            <StatCard title="Today's Classes" value={data?.todayClasses?.length ?? 0} subtitle={data?.todayClasses?.length ? 'Scheduled' : 'Free day'} icon={Clock} iconColor="text-sky-500" />
            <StatCard title="Pending Results" value={data?.pendingResults ?? 0} subtitle="Awaiting entry" icon={ClipboardList} iconColor="text-amber-500" />
            <StatCard title="Announcements" value={data?.recentAnnouncements?.length ?? 0} subtitle="Recent updates" icon={Megaphone} iconColor="text-rose-500" />
          </>
        )}
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Your classes for {weekdayName || 'today'}</CardDescription>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="ml-auto px-3 py-1.5 text-sm border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[150px] font-medium bg-background text-foreground"
            />
          </CardHeader>
          <CardContent className="grid gap-3">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
            ) : data?.todayClasses?.length > 0 ? (
              data.todayClasses.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 shrink-0 min-w-[105px]">
                    <span className="text-sm font-bold leading-tight whitespace-nowrap">{c.startTime} - {c.endTime}</span>
                  </div>
                  <div className="grid gap-1 min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{c.courseCode} — {c.courseName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {c.courseSemester && <span>Sem {c.courseSemester}</span>}
                      {c.section?.startsWith('Evening') && <span>Sec {c.section}</span>}
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {c.room || 'TBD'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-10 text-muted-foreground/30" />
                <span>No classes scheduled for this date</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
            <CardDescription>Currently assigned</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {isLoading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
            ) : data?.courses?.length > 0 ? (
              data.courses.map((c: any) => (
                <div key={c.id} className="flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">{c.courseName}</p>
                    <p className="text-sm text-muted-foreground">{c.courseCode}</p>
                  </div>
                  <div className="ml-auto font-medium text-xs whitespace-nowrap">
                    Sec {c.section}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No courses assigned</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== Student Dashboard ====================

function StudentDashboard() {
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }, [])

  const weekdayName = useMemo(() => {
    if (!selectedDate) return ''
    const d = new Date(selectedDate)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' })
  }, [selectedDate])

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null
      const res = await fetch(`/api/dashboard/overview?date=${selectedDate}`)
      const json = await res.json()
      return json.data
    },
    enabled: !!selectedDate,
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-0 animate-fade-in">
      <PageHeader title="Dashboard" description={`Welcome back, ${data?.studentName || ''}`} />

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {isLoading ? <StatCardsSkeleton /> : (
          <>
            <StatCard title="Attendance" value={`${data?.attendanceRate ?? 0}%`} subtitle={`${data?.totalAttendanceRecords ?? 0} classes`} icon={CheckCircle} iconColor={data?.attendanceRate >= 75 ? 'text-emerald-500' : data?.attendanceRate >= 50 ? 'text-amber-500' : 'text-rose-500'} />
            <StatCard title="CGPA" value={data?.gpa != null ? data.gpa.toFixed(2) : '—'} subtitle="Cumulative" icon={Award} iconColor="text-violet-500" />
            <StatCard title="Credits" value={data?.totalCredits ?? 0} subtitle="Completed" icon={TrendingUp} iconColor="text-sky-500" />
            <StatCard
              title="Class & Semester"
              value={`Semester ${data?.semester ?? 1}`}
              subtitle={`${data?.shift || 'Morning'} Shift · Sec ${data?.section || '—'}`}
              icon={GraduationCap}
              iconColor="text-emerald-500"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Your classes for {weekdayName || 'today'}</CardDescription>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="ml-auto px-3 py-1.5 text-sm border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[150px] font-medium bg-background text-foreground"
            />
          </CardHeader>
          <CardContent className="grid gap-3">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
            ) : data?.todayClasses?.length > 0 ? (
              data.todayClasses.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 px-3 py-1.5 shrink-0 min-w-[105px]">
                    <span className="text-sm font-bold leading-tight whitespace-nowrap">{c.startTime} - {c.endTime}</span>
                  </div>
                  <div className="grid gap-1 min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{c.courseCode} — {c.courseName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {c.courseSemester && <span>Sem {c.courseSemester}</span>}
                      {c.section?.startsWith('Evening') && <span>Sec {c.section}</span>}
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {c.room || 'TBD'}</span>
                    </div>
                    {c.faculty && (
                      <p className="text-xs font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" /> {c.faculty}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-10 text-muted-foreground/30" />
                <span>No classes scheduled for this date</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Latest updates</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {isLoading ? (
                <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
              ) : data?.recentAnnouncements?.length > 0 ? (
                data.recentAnnouncements.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/20">
                      <Megaphone className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="grid gap-0.5 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No announcements</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

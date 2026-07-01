'use client'

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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'

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

function StatCard({ title, value, subtitle, icon: Icon, iconBg, isLoading }: {
  title: string; value: number | string; subtitle?: string
  icon: React.ElementType; iconBg: string; isLoading?: boolean
}) {
  return (
    <Card className="relative overflow-hidden border shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            {isLoading ? (
              <><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-8" /><Skeleton className="h-2 w-20" /></>
            ) : (
              <>
                <p className="text-xs font-semibold text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {subtitle && <p className="text-[10px] text-muted-foreground font-medium">{subtitle}</p>}
              </>
            )}
          </div>
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            {isLoading ? <Loader2 className="size-4 animate-spin text-white/70" /> : <Icon className="size-4 text-white" />}
          </div>
        </div>
      </CardContent>
      <div className={`absolute bottom-0 left-0 h-0.5 w-full ${iconBg}`} />
    </Card>
  )
}

function StatCardsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-8" /><Skeleton className="h-2 w-20" />
              </div>
              <Skeleton className="size-9 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function ChartSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-56" /></CardHeader>
      <CardContent><Skeleton className="aspect-[2/1] w-full rounded-lg" /></CardContent>
    </Card>
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

  const { data: gradeData, isLoading: gradeLoading } = useQuery({
    queryKey: ['dashboard-grade-distribution'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/charts/grade-distribution')
      const json = await res.json()
      return json.data || []
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

  const gradeChartConfig: ChartConfig = { count: { label: 'Count', color: 'var(--color-emerald-500)' } }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description="Overview of the department's key metrics and activities" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? <StatCardsSkeleton /> : (
          <>
            <StatCard title="Total Students" value={overview?.totalStudents ?? 0} subtitle="Enrolled" icon={GraduationCap} iconBg="bg-emerald-600" />
            <StatCard title="Total Faculty" value={overview?.totalFaculty ?? 0} subtitle="Active members" icon={Users} iconBg="bg-sky-600" />
            <StatCard title="Classrooms" value={overview?.totalRooms ?? 0} subtitle="Rooms & labs" icon={School} iconBg="bg-amber-600" />
            <StatCard title="Announcements" value={overview?.totalAnnouncements ?? 0} subtitle="Published" icon={Megaphone} iconBg="bg-rose-600" />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {gradeLoading ? <ChartSkeleton /> : (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><BarChartIcon className="size-4 text-emerald-600" /><CardTitle className="text-base">Grade Distribution</CardTitle></div>
              <p className="text-xs text-muted-foreground">Latest completed semester results</p>
            </CardHeader>
            <CardContent>
              {gradeData && gradeData.length > 0 ? (
                <ChartContainer config={gradeChartConfig} className="h-[250px] w-full">
                  <BarChart data={gradeData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="grade" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">No grade data available</div>
              )}
            </CardContent>
          </Card>
        )}

        {attendanceLoading ? <ChartSkeleton /> : (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><ClipboardCheckIcon className="size-4 text-emerald-600" /><CardTitle className="text-base">Attendance Trend</CardTitle></div>
              <p className="text-xs text-muted-foreground">Average attendance rate per week</p>
            </CardHeader>
            <CardContent>
              {attendanceData && attendanceData.length > 0 ? (
                <ChartContainer config={{ percentage: { label: 'Attendance %', color: 'var(--color-amber-500)' } }} className="h-[250px] w-full">
                  <LineChart data={attendanceData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value: any) => [`${value}%`, 'Attendance']} />} />
                    <Line type="monotone" dataKey="percentage" stroke="var(--color-percentage)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-percentage)' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">No attendance data available</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Announcements + Events */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><Megaphone className="size-4 text-emerald-600" /><CardTitle className="text-base">Recent Announcements</CardTitle></div></CardHeader>
          <CardContent className="max-h-80 overflow-y-auto custom-scrollbar">
            {recentAnnouncements && recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {recentAnnouncements.map((item: any) => (
                  <div key={item.id} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="mb-1 flex items-center gap-2">{getTypeBadge(item.type)}<span className="ml-auto text-xs text-muted-foreground">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span></div>
                    <h4 className="text-sm font-medium leading-snug">{item.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                  </div>
                ))}
              </div>
            ) : <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No announcements yet</div>}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-emerald-600" /><CardTitle className="text-base">Upcoming Events</CardTitle></div></CardHeader>
          <CardContent className="max-h-80 overflow-y-auto custom-scrollbar">
            {overview?.upcomingEvents && overview.upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {overview.upcomingEvents.map((event: any) => (
                  <div key={event.id} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <h4 className="text-sm font-medium">{event.title}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {event.eventDate && <span className="flex items-center gap-1"><CalendarDays className="size-3" />{new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}
                      {event.eventLocation && <span className="flex items-center gap-1"><MapPin className="size-3" />{event.eventLocation}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-8 text-muted-foreground/30" /><span>No upcoming events</span></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== Faculty Dashboard ====================

function FacultyDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/overview')
      const json = await res.json()
      return json.data
    },
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description="Your teaching overview" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? <StatCardsSkeleton /> : (
          <>
            <StatCard title="My Courses" value={data?.courseCount ?? 0} subtitle="Assigned this semester" icon={BookOpen} iconBg="bg-emerald-600" />
            <StatCard title="Today's Classes" value={data?.todayClasses?.length ?? 0} subtitle={data?.todayClasses?.length ? 'Scheduled' : 'Free day'} icon={Clock} iconBg="bg-sky-600" />
            <StatCard title="Pending Results" value={data?.pendingResults ?? 0} subtitle="Awaiting entry" icon={ClipboardList} iconBg="bg-amber-600" />
            <StatCard title="Announcements" value={data?.recentAnnouncements?.length ?? 0} subtitle="Recent" icon={Megaphone} iconBg="bg-rose-600" />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Schedule */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><Clock className="size-4 text-emerald-600" /><CardTitle className="text-base">Today's Schedule</CardTitle></div></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : data?.todayClasses?.length > 0 ? (
              data.todayClasses.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex flex-col items-center min-w-14">
                    <span className="text-xs font-bold text-slate-700">{c.startTime}</span>
                    <span className="text-[10px] text-slate-400">{c.endTime}</span>
                  </div>
                  <div className="border-l pl-3 flex-1">
                    <p className="text-sm font-medium text-slate-800">{c.courseCode} — {c.courseName}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="size-3" />{c.room}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-8 text-muted-foreground/30" />
                <span>No classes today</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Courses */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><BookOpen className="size-4 text-emerald-600" /><CardTitle className="text-base">My Courses</CardTitle></div></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : data?.courses?.length > 0 ? (
              data.courses.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.courseCode} — {c.courseName}</p>
                    <p className="text-xs text-slate-400">{c.semester}{c.section ? ` · Sec ${c.section}` : ''}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{c.courseCode}</Badge>
                </div>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No courses assigned</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3"><div className="flex items-center gap-2"><Megaphone className="size-4 text-emerald-600" /><CardTitle className="text-base">Recent Announcements</CardTitle></div></CardHeader>
        <CardContent className="max-h-64 overflow-y-auto">
          {data?.recentAnnouncements?.length > 0 ? (
            <div className="space-y-3">
              {data.recentAnnouncements.map((item: any) => (
                <div key={item.id} className="rounded-lg border p-3 hover:bg-muted/50">
                  <div className="mb-1 flex items-center gap-2">{getTypeBadge(item.type)}<span className="ml-auto text-xs text-muted-foreground">{new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
                  <h4 className="text-sm font-medium">{item.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                </div>
              ))}
            </div>
          ) : <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">No announcements</div>}
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== Student Dashboard ====================

function StudentDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/overview')
      const json = await res.json()
      return json.data
    },
  })

  const attendanceColor = (rate: number) => rate >= 75 ? 'bg-emerald-600' : rate >= 50 ? 'bg-amber-600' : 'bg-rose-600'

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description={`Welcome back, ${data?.studentName || ''}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? <StatCardsSkeleton /> : (
          <>
            <StatCard title="Attendance" value={`${data?.attendanceRate ?? 0}%`} subtitle={`${data?.totalAttendanceRecords ?? 0} classes`} icon={CheckCircle} iconBg={attendanceColor(data?.attendanceRate ?? 0)} />
            <StatCard title="CGPA" value={data?.gpa != null ? data.gpa.toFixed(2) : '—'} subtitle="Cumulative" icon={Award} iconBg="bg-violet-600" />
            <StatCard title="Credits" value={data?.totalCredits ?? 0} subtitle="Completed" icon={TrendingUp} iconBg="bg-sky-600" />
            <StatCard title="Semester" value={data?.semester ?? 1} subtitle={data?.section ? `Sec ${data.section}` : ''} icon={GraduationCap} iconBg="bg-emerald-600" />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Schedule */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><Clock className="size-4 text-emerald-600" /><CardTitle className="text-base">Today's Schedule</CardTitle></div></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : data?.todayClasses?.length > 0 ? (
              data.todayClasses.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex flex-col items-center min-w-14">
                    <span className="text-xs font-bold text-slate-700">{c.startTime}</span>
                    <span className="text-[10px] text-slate-400">{c.endTime}</span>
                  </div>
                  <div className="border-l pl-3 flex-1">
                    <p className="text-sm font-medium text-slate-800">{c.courseCode} — {c.courseName}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="size-3" />{c.room}{c.faculty ? ` · ${c.faculty}` : ''}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-8 text-muted-foreground/30" />
                <span>No classes today</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Courses */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><BookOpen className="size-4 text-emerald-600" /><CardTitle className="text-base">My Courses</CardTitle></div></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : data?.courses?.length > 0 ? (
              data.courses.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.code} — {c.name}</p>
                    <p className="text-xs text-slate-400">{c.semester} · {c.creditHours} cr</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{c.code}</Badge>
                </div>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Not enrolled in any courses</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements + Events */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><Megaphone className="size-4 text-emerald-600" /><CardTitle className="text-base">Recent Announcements</CardTitle></div></CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {data?.recentAnnouncements?.length > 0 ? (
              <div className="space-y-3">
                {data.recentAnnouncements.map((item: any) => (
                  <div key={item.id} className="rounded-lg border p-3 hover:bg-muted/50">
                    <div className="mb-1 flex items-center gap-2">{getTypeBadge(item.type)}<span className="ml-auto text-xs text-muted-foreground">{new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                  </div>
                ))}
              </div>
            ) : <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">No announcements</div>}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-emerald-600" /><CardTitle className="text-base">Upcoming Events</CardTitle></div></CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {data?.upcomingEvents?.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingEvents.map((event: any) => (
                  <div key={event.id} className="rounded-lg border p-3 hover:bg-muted/50">
                    <h4 className="text-sm font-medium">{event.title}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {event.eventDate && <span className="flex items-center gap-1"><CalendarDays className="size-3" />{new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>}
                      {event.eventLocation && <span className="flex items-center gap-1"><MapPin className="size-3" />{event.eventLocation}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="flex h-24 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-8 text-muted-foreground/30" /><span>No upcoming events</span></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== Icons ====================

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  )
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}

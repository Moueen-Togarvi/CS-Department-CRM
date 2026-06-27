'use client'

import { useQuery } from '@tanstack/react-query'
import {
  GraduationCap,
  Users,
  BookOpen,
  Megaphone,
  CalendarDays,
  MapPin,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'

// ==================== Types ====================

interface OverviewData {
  totalStudents: number
  totalFaculty: number
  totalCourses: number
  totalAnnouncements: number
  activeSemester: { id: string; name: string } | null
  currentSemesterStudents: number
  upcomingEvents: Array<{
    id: string
    title: string
    type: string
    eventDate: string | null
    eventLocation: string | null
  }>
}

interface ChartDataPoint {
  [key: string]: string | number
}

interface RecentAnnouncement {
  id: string
  title: string
  type: string
  content: string
  publishedAt: string
}

// ==================== Chart Configs ====================

const enrollmentChartConfig: ChartConfig = {
  students: {
    label: 'Students',
    color: 'var(--color-emerald-500)',
  },
}

const gradeChartConfig: ChartConfig = {
  count: {
    label: 'Count',
    color: 'var(--color-emerald-500)',
  },
}

const fypChartConfig: ChartConfig = {
  Proposed: { label: 'Proposed', color: 'hsl(var(--chart-1))' },
  Approved: { label: 'Approved', color: 'hsl(var(--chart-2))' },
  'In Progress': { label: 'In Progress', color: 'hsl(var(--chart-3))' },
  Submitted: { label: 'Submitted', color: 'hsl(var(--chart-4))' },
  Evaluated: { label: 'Evaluated', color: 'hsl(var(--chart-5))' },
  Defended: { label: 'Defended', color: 'hsl(160 60% 45%)' },
  Passed: { label: 'Passed', color: 'hsl(142 71% 45%)' },
  Failed: { label: 'Failed', color: 'hsl(0 84% 60%)' },
}

const FYP_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(160 60% 45%)',
  'hsl(142 71% 45%)',
  'hsl(0 84% 60%)',
]

// ==================== Data Fetchers ====================

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json = await res.json()
  if (json.success && json.data) return json.data as T
  return json as T
}

// ==================== Stat Card Component ====================

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  iconBg: string
  isLoading?: boolean
}

function StatCard({ title, value, subtitle, icon: Icon, iconBg, isLoading }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-32" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <p className="text-3xl font-bold tracking-tight">{value}</p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </div>
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-white/70" />
            ) : (
              <Icon className="size-5 text-white" />
            )}
          </div>
        </div>
      </CardContent>
      {/* Decorative accent line at bottom */}
      <div className={`absolute bottom-0 left-0 h-1 w-full ${iconBg.replace('bg-', 'bg-').replace('/90', '/60')}`} />
    </Card>
  )
}

// ==================== Chart Skeleton ====================

function ChartSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="aspect-[2/1] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

// ==================== Stat Cards Skeleton ====================

function StatCardsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="relative overflow-hidden border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="size-11 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

// ==================== Badge color for announcement type ====================

function getTypeBadge(type: string) {
  switch (type) {
    case 'URGENT':
      return <Badge variant="destructive">Urgent</Badge>
    case 'EVENT':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
          Event
        </Badge>
      )
    case 'SEMINAR':
      return (
        <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300">
          Seminar
        </Badge>
      )
    case 'NOTICE':
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300">
          Notice
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">General</Badge>
      )
  }
}

// ==================== Main Dashboard Module ====================

export function DashboardModule() {
  // Fetch overview data
  const {
    data: overview,
    isLoading: overviewLoading,
  } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => fetchJSON<OverviewData>('/api/dashboard/overview'),
  })

  // Fetch chart data
  const { data: enrollmentData, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['dashboard-enrollment-trend'],
    queryFn: () => fetchJSON<ChartDataPoint[]>('/api/dashboard/charts/enrollment-trend'),
  })

  const { data: gradeData, isLoading: gradeLoading } = useQuery({
    queryKey: ['dashboard-grade-distribution'],
    queryFn: () => fetchJSON<ChartDataPoint[]>('/api/dashboard/charts/grade-distribution'),
  })

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['dashboard-attendance-trend'],
    queryFn: () => fetchJSON<ChartDataPoint[]>('/api/dashboard/charts/attendance-trend'),
  })

  const { data: fypData, isLoading: fypLoading } = useQuery({
    queryKey: ['dashboard-fyp-status'],
    queryFn: () => fetchJSON<ChartDataPoint[]>('/api/dashboard/charts/fyp-status'),
  })

  const { data: recentAnnouncements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['dashboard-recent-announcements'],
    queryFn: async () => {
      const res = await fetch('/api/announcements?limit=5&sort=latest')
      const json = await res.json()
      return json.success ? json.data : []
    },
  })

  const semName = overview?.activeSemester?.name ?? 'Current'
  const semesterStudents = overview?.currentSemesterStudents ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Overview of the department's key metrics and activities"
      />

      {/* ==================== Stat Cards Row ==================== */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overviewLoading ? (
          <StatCardsSkeleton />
        ) : (
          <>
            <StatCard
              title="Total Students"
              value={overview?.totalStudents ?? 0}
              subtitle={`+${semesterStudents} enrolled this semester`}
              icon={GraduationCap}
              iconBg="bg-emerald-600"
            />
            <StatCard
              title="Total Faculty"
              value={overview?.totalFaculty ?? 0}
              subtitle="Active faculty members"
              icon={Users}
              iconBg="bg-sky-600"
            />
            <StatCard
              title="Active Courses"
              value={overview?.totalCourses ?? 0}
              subtitle={`${semName} semester`}
              icon={BookOpen}
              iconBg="bg-amber-600"
            />
            <StatCard
              title="Announcements"
              value={overview?.totalAnnouncements ?? 0}
              subtitle="Published announcements"
              icon={Megaphone}
              iconBg="bg-rose-600"
            />
          </>
        )}
      </div>

      {/* ==================== Charts Grid ==================== */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Enrollment Trend - Line Chart */}
        {enrollmentLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" />
                <CardTitle className="text-base">Enrollment Trend</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Students per batch</p>
            </CardHeader>
            <CardContent>
              {enrollmentData && enrollmentData.length > 0 ? (
                <ChartContainer
                  config={enrollmentChartConfig}
                  className="h-[250px] w-full"
                >
                  <LineChart
                    data={enrollmentData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="semester"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={12}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={12}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Line
                      type="monotone"
                      dataKey="students"
                      stroke="var(--color-students)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: 'var(--color-students)' }}
                      activeDot={{ r: 6, fill: 'var(--color-students)' }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  No enrollment data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Grade Distribution - Bar Chart */}
        {gradeLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3Icon className="size-4 text-emerald-600" />
                <CardTitle className="text-base">Grade Distribution</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Latest completed semester results</p>
            </CardHeader>
            <CardContent>
              {gradeData && gradeData.length > 0 ? (
                <ChartContainer
                  config={gradeChartConfig}
                  className="h-[250px] w-full"
                >
                  <BarChart
                    data={gradeData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="grade"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={12}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  No grade data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FYP Status - Donut/Pie Chart */}
        {fypLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FolderKanbanIcon className="size-4 text-emerald-600" />
                <CardTitle className="text-base">FYP Project Status</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Breakdown by project status</p>
            </CardHeader>
            <CardContent>
              {fypData && fypData.length > 0 ? (
                <ChartContainer
                  config={fypChartConfig}
                  className="mx-auto h-[250px] w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="status" />}
                    />
                    <Pie
                      data={fypData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      strokeWidth={2}
                    >
                      {fypData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={FYP_COLORS[index % FYP_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="status" />}
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  No FYP projects found
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attendance Trend - Line Chart */}
        {attendanceLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ClipboardCheckIcon className="size-4 text-emerald-600" />
                <CardTitle className="text-base">Attendance Trend</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Average attendance rate per week</p>
            </CardHeader>
            <CardContent>
              {attendanceData && attendanceData.length > 0 ? (
                <ChartContainer
                  config={{
                    percentage: {
                      label: 'Attendance %',
                      color: 'var(--color-amber-500)',
                    },
                  }}
                  className="h-[250px] w-full"
                >
                  <LineChart
                    data={attendanceData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={12}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={12}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: number) => [`${value}%`, 'Attendance']}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="var(--color-percentage)"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: 'var(--color-percentage)' }}
                      activeDot={{ r: 6, fill: 'var(--color-percentage)' }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  No attendance data available
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ==================== Bottom Section: Announcements + Events ==================== */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Announcements */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-emerald-600" />
              <CardTitle className="text-base">Recent Announcements</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto custom-scrollbar">
            {announcementsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : recentAnnouncements && recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {recentAnnouncements.map(
                  (item: {
                    id: string
                    title: string
                    type: string
                    content: string
                    publishedAt: string
                  }) => (
                    <div
                      key={item.id}
                      className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {getTypeBadge(item.type)}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium leading-snug">{item.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.content}
                      </p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No announcements yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-emerald-600" />
              <CardTitle className="text-base">Upcoming Events</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto custom-scrollbar">
            {overviewLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : overview?.upcomingEvents && overview.upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {overview.upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <h4 className="text-sm font-medium">{event.title}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {event.eventDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {new Date(event.eventDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                      {event.eventLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {event.eventLocation}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-8 text-muted-foreground/30" />
                <span>No upcoming events</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== Inline Icon Components (to avoid name conflicts) ====================

function BarChart3Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  )
}

function FolderKanbanIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M8 10v4" />
      <path d="M12 10v2" />
      <path d="M16 10v6" />
    </svg>
  )
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}

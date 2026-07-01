'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, TrendingUp, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface CourseSummary {
  courseId: string
  courseName: string
  courseCode: string
  present: number
  total: number
  percentage: number
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  remarks: string | null
  course: { id: string; code: string; name: string }
}

const STATUS_STYLE: Record<string, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ABSENT: 'bg-red-50 text-red-700 border-red-200',
  LATE: 'bg-amber-50 text-amber-700 border-amber-200',
  EXCUSED: 'bg-sky-50 text-sky-700 border-sky-200',
}

export function StudentAttendanceModule() {
  const user = useAuthStore((s) => s.user)
  const studentId = user?.studentId || ''

  const { data: summary, isLoading: summaryLoading } = useQuery<CourseSummary[]>({
    queryKey: ['student-attendance-summary', studentId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/student/${studentId}/summary`)
      const json = await res.json()
      return json.data || []
    },
    enabled: !!studentId,
  })

  const { data: records, isLoading: recordsLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['student-attendance-records', studentId],
    queryFn: async () => {
      // Server scopes to the logged-in student automatically
      const res = await fetch('/api/attendance?limit=200')
      const json = await res.json()
      return json.data || []
    },
    enabled: !!studentId,
  })

  const overall = useMemo(() => {
    if (!summary || summary.length === 0) return null
    const totalClasses = summary.reduce((a, c) => a + c.total, 0)
    const totalPresent = summary.reduce((a, c) => a + c.present, 0)
    const pct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 1000) / 10 : 0
    return { totalClasses, totalPresent, pct }
  }, [summary])

  const atRiskCount = useMemo(
    () => (summary || []).filter((c) => c.total > 0 && c.percentage < 75).length,
    [summary]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Attendance"
        description="Your attendance percentage across all enrolled courses."
      />

      {/* Overall stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {overall ? `${overall.pct}%` : '—'}
              </p>
              <p className="text-xs text-slate-500">Overall Attendance</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <ClipboardCheck className="size-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {overall ? `${overall.totalPresent}/${overall.totalClasses}` : '—'}
              </p>
              <p className="text-xs text-slate-500">Classes Attended</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn(
              'size-10 rounded-xl flex items-center justify-center',
              atRiskCount > 0 ? 'bg-amber-50' : 'bg-slate-50'
            )}>
              <AlertTriangle className={cn('size-5', atRiskCount > 0 ? 'text-amber-600' : 'text-slate-400')} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{atRiskCount}</p>
              <p className="text-xs text-slate-500">Below 75% (at risk)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-course summary */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">Course-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summaryLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !summary || summary.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No attendance records yet.</p>
          ) : (
            summary.map((c) => {
              const barColor =
                c.percentage >= 75 ? '[&>div]:bg-emerald-500'
                  : c.percentage >= 50 ? '[&>div]:bg-amber-500'
                  : '[&>div]:bg-red-500'
              return (
                <div key={c.courseId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                        {c.courseCode}
                      </Badge>
                      <span className="font-medium text-slate-700 truncate">{c.courseName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500">
                        {c.present}/{c.total}
                      </span>
                      <span className={cn(
                        'text-sm font-bold',
                        c.percentage >= 75 ? 'text-emerald-600'
                          : c.percentage >= 50 ? 'text-amber-600'
                          : 'text-red-600'
                      )}>
                        {c.percentage}%
                      </span>
                    </div>
                  </div>
                  <Progress value={c.percentage} className={cn('h-2', barColor)} />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Detailed history */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : !records || records.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No attendance history.</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {format(new Date(r.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {r.course.code}
                          </Badge>
                          <span className="text-sm text-slate-700 truncate">{r.course.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold',
                          STATUS_STYLE[r.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                        )}>
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

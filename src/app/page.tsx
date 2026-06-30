'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { useAppStore } from '@/stores/app-store'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'
import { DashboardModule } from '@/components/dashboard/dashboard-module'
import { StudentModule } from '@/components/students/student-module'
import { FacultyModule } from '@/components/faculty/faculty-module'
import { CourseModule } from '@/components/courses/course-module'
import { TimetableModule } from '@/components/timetable/timetable-module'
import { AttendanceModule } from '@/components/attendance/attendance-module'
import { ResultModule } from '@/components/results/result-module'
import { AnnouncementModule } from '@/components/announcements/announcement-module'
import { FYPModule } from '@/components/fyp/fyp-module'
import { DocumentModule } from '@/components/documents/document-module'
import { RoomsModule } from '@/components/rooms/rooms-module'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

export default function Home() {
  const activeModule = useAppStore((s) => s.activeModule)
  useKeyboardShortcuts()

  return (
    <AppLayout>
      <ModuleErrorBoundary>
        {activeModule === 'dashboard' && <DashboardModule />}
        {activeModule === 'students' && <StudentModule />}
        {activeModule === 'faculty' && <FacultyModule />}
        {activeModule === 'courses' && <CourseModule />}
        {activeModule === 'timetable' && <TimetableModule />}
        {activeModule === 'attendance' && <AttendanceModule />}
        {activeModule === 'results' && <ResultModule />}
        {activeModule === 'announcements' && <AnnouncementModule />}
        {activeModule === 'fyp' && <FYPModule />}
        {activeModule === 'documents' && <DocumentModule />}
        {activeModule === 'rooms' && <RoomsModule />}
      </ModuleErrorBoundary>
    </AppLayout>
  )
}
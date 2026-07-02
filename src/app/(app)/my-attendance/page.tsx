import { StudentAttendanceModule } from '@/components/attendance/student-attendance-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function MyAttendancePage() {
  return (
    <ModuleErrorBoundary>
      <StudentAttendanceModule />
    </ModuleErrorBoundary>
  )
}

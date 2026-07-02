import { AttendanceModule } from '@/components/attendance/attendance-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function AttendancePage() {
  return (
    <ModuleErrorBoundary>
      <AttendanceModule />
    </ModuleErrorBoundary>
  )
}

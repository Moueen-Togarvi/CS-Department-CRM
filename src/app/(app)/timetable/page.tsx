import { TimetableModule } from '@/components/timetable/timetable-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function TimetablePage() {
  return (
    <ModuleErrorBoundary>
      <TimetableModule />
    </ModuleErrorBoundary>
  )
}

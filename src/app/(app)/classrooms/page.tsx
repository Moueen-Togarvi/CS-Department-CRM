import { ClassroomsModule } from '@/components/classrooms/classrooms-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function ClassroomsPage() {
  return (
    <ModuleErrorBoundary>
      <ClassroomsModule />
    </ModuleErrorBoundary>
  )
}

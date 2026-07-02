import { StudentModule } from '@/components/students/student-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function StudentsPage() {
  return (
    <ModuleErrorBoundary>
      <StudentModule />
    </ModuleErrorBoundary>
  )
}

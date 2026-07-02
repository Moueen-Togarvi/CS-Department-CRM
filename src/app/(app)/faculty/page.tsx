import { FacultyModule } from '@/components/faculty/faculty-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function FacultyPage() {
  return (
    <ModuleErrorBoundary>
      <FacultyModule />
    </ModuleErrorBoundary>
  )
}

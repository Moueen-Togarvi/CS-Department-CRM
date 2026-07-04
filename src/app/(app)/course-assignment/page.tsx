import { CourseAssignmentModule } from '@/components/course-assignment/course-assignment-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function CourseAssignmentPage() {
  return (
    <ModuleErrorBoundary>
      <CourseAssignmentModule />
    </ModuleErrorBoundary>
  )
}

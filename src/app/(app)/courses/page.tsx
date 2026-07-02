import { CourseModule } from '@/components/courses/course-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function CoursesPage() {
  return (
    <ModuleErrorBoundary>
      <CourseModule />
    </ModuleErrorBoundary>
  )
}

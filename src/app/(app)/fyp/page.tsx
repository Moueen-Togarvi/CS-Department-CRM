import { FYPModule } from '@/components/fyp/fyp-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function FYPPage() {
  return (
    <ModuleErrorBoundary>
      <FYPModule />
    </ModuleErrorBoundary>
  )
}

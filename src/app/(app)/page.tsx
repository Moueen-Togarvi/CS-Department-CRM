import { DashboardModule } from '@/components/dashboard/dashboard-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function DashboardPage() {
  return (
    <ModuleErrorBoundary>
      <DashboardModule />
    </ModuleErrorBoundary>
  )
}

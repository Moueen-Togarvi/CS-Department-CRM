import { ResultModule } from '@/components/results/result-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function ResultsPage() {
  return (
    <ModuleErrorBoundary>
      <ResultModule />
    </ModuleErrorBoundary>
  )
}

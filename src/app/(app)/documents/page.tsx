import { DocumentModule } from '@/components/documents/document-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function DocumentsPage() {
  return (
    <ModuleErrorBoundary>
      <DocumentModule />
    </ModuleErrorBoundary>
  )
}

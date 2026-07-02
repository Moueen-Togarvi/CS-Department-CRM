import { AnnouncementModule } from '@/components/announcements/announcement-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function AnnouncementsPage() {
  return (
    <ModuleErrorBoundary>
      <AnnouncementModule />
    </ModuleErrorBoundary>
  )
}

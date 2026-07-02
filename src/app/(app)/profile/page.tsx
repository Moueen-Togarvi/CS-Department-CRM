import { ProfileModule } from '@/components/profile/profile-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default function ProfilePage() {
  return (
    <ModuleErrorBoundary>
      <ProfileModule />
    </ModuleErrorBoundary>
  )
}

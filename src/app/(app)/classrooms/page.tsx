import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ClassroomsModule } from '@/components/classrooms/classrooms-module'
import { ModuleErrorBoundary } from '@/components/shared/module-error-boundary'

export default async function ClassroomsPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    redirect('/')
  }
  return (
    <ModuleErrorBoundary>
      <ClassroomsModule />
    </ModuleErrorBoundary>
  )
}

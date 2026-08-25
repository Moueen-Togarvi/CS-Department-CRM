import { useQuery } from '@tanstack/react-query'

export interface DepartmentOption {
  id: string
  name: string
  code: string
}

/** Department list for form selects. Cached for five minutes — it rarely changes. */
export function useDepartments() {
  return useQuery<DepartmentOption[]>({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await fetch('/api/departments')
      if (!res.ok) throw new Error('Failed to fetch departments')
      const json: { success: boolean; data: DepartmentOption[] } = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

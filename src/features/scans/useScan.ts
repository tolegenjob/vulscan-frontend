import { useQuery } from '@tanstack/react-query'
import { scansApi } from '../../api/endpoints/scans'
import { isActiveScan } from './status'

/** Опрос каждые 2 с, пока скан активен; при ошибках сети интервал растёт до 10 с. */
export function useScan(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: () => scansApi.get(id),
    refetchInterval: (query) => {
      const failures = query.state.fetchFailureCount + query.state.errorUpdateCount
      if (query.state.error && failures > 0) return Math.min(2000 * 2 ** Math.min(failures, 3), 10_000)
      return isActiveScan(query.state.data?.status) ? 2000 : false
    },
  })
}

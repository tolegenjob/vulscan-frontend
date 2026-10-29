import { Box, Typography } from '@mui/material'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { Severity } from '../../api/types'
import { SEVERITIES, severityLabel } from '../../components/badges'

const fill: Record<Severity, string> = {
  CRITICAL: '#b71c1c',
  HIGH: '#e53935',
  MEDIUM: '#fb8c00',
  LOW: '#1e88e5',
  INFO: '#757575',
}

/** Значения подписаны на столбцах и дублируются в таблице ниже, поэтому смысл не зависит от цвета. */
export function SeverityChart({ counts }: { counts: Record<Severity, number> }) {
  const data = SEVERITIES.map((s) => ({ severity: s, name: severityLabel(s), count: counts[s] ?? 0 }))
  return (
    <Box>
      <Box sx={{ width: '100%', height: 240 }} role="img" aria-label="Открытые находки по серьёзности">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 240 }}>
          <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Bar dataKey="count" isAnimationActive={false} fill="#1e88e5">
              <LabelList dataKey="count" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <Typography component="div" variant="caption" color="text.secondary">
        {data.map((d) => `${d.name}: ${d.count}`).join(' · ')}
      </Typography>
    </Box>
  )
}
export { fill as severityFill }

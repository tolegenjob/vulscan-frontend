import { Checkbox, FormControlLabel, FormGroup, FormHelperText, Typography } from '@mui/material'
import type { ModuleType } from '../../api/types'
import { moduleLabel } from './status'

interface Props {
  selected: ModuleType[]
  onChange: (modules: ModuleType[]) => void
  /** Причина, по которой модуль недоступен. */
  disabledReasons: Partial<Record<ModuleType, string>>
}

const ORDER: ModuleType[] = ['XSS', 'SQLI', 'IDOR']

export function ModuleSelector({ selected, onChange, disabledReasons }: Props) {
  function toggle(m: ModuleType, on: boolean) {
    onChange(on ? [...selected, m] : selected.filter((x) => x !== m))
  }
  return (
    <FormGroup>
      <Typography variant="subtitle2">Модули</Typography>
      {ORDER.map((m) => {
        const reason = disabledReasons[m]
        return (
          <div key={m}>
            <FormControlLabel
              control={<Checkbox checked={selected.includes(m)} disabled={!!reason} onChange={(e) => toggle(m, e.target.checked)} />}
              label={moduleLabel[m]}
            />
            {reason && <FormHelperText sx={{ ml: 4, mt: -1 }}>{reason}</FormHelperText>}
          </div>
        )
      })}
    </FormGroup>
  )
}

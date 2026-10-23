import type { PositionDefinition, Role } from '@/api/types'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function RoleSelect({
  id,
  roles,
  positions,
  value,
  onChange,
  allowed,
}: {
  id: string
  roles: Role[]
  positions: PositionDefinition[]
  value: string
  onChange: (role: string) => void
  /** Only offer these role keys (the roles a league's data supports). */
  allowed?: string[]
}) {
  const usable = allowed ? roles.filter((role) => allowed.includes(role.key)) : roles
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Choose a role" />
      </SelectTrigger>
      <SelectContent>
        {positions
          .filter((position) => usable.some((role) => role.position === position.code))
          .map((position) => (
            <SelectGroup key={position.code}>
              <SelectLabel>{position.label}</SelectLabel>
              {usable
                .filter((role) => role.position === position.code)
                .map((role) => (
                  <SelectItem key={role.key} value={role.key}>
                    {role.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
      </SelectContent>
    </Select>
  )
}

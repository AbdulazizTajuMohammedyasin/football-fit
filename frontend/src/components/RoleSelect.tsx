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
}: {
  id: string
  roles: Role[]
  positions: PositionDefinition[]
  value: string
  onChange: (role: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Choose a role" />
      </SelectTrigger>
      <SelectContent>
        {positions.map((position) => (
          <SelectGroup key={position.code}>
            <SelectLabel>{position.label}</SelectLabel>
            {roles
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

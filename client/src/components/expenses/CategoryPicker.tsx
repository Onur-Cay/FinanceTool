import { Category } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CategoryPickerProps {
  categories: Category[]
  value: string
  onValueChange: (value: string) => void
}

export function CategoryPicker({ categories, value, onValueChange }: CategoryPickerProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectGroup key={category.id}>
            <SelectLabel className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide px-2 pt-2 pb-0">
              {category.name}
            </SelectLabel>
            <SelectSeparator className="my-1 opacity-50" />
            {category.sub_categories.map((sub) => (
              <SelectItem key={sub.id} value={String(sub.id)}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

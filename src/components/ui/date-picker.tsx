import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { CalendarIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: string
  onChange: (date: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  allowClear?: boolean
  id?: string
}

export function DatePicker({
  date,
  onChange,
  disabled,
  className,
  placeholder = "Selecciona una fecha",
  allowClear = true,
  id,
}: DatePickerProps) {
  const selectedDate = date ? new Date(date + 'T12:00:00') : undefined

  return (
    <div className="relative w-full group">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal transition-all hover:bg-muted/50",
                !date && "text-muted-foreground",
                className
              )}
              disabled={disabled}
              id={id}
            >
              <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
              <span className="truncate">
                {date ? (
                  format(selectedDate!, "PPP", { locale: es })
                ) : (
                  <span>{placeholder}</span>
                )}
              </span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0 border shadow-lg rounded-xl" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"))
              }
            }}
            initialFocus
            locale={es}
            className="rounded-xl"
          />
        </PopoverContent>
      </Popover>
      
      {allowClear && date && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation()
            onChange("")
          }}
        >
          <XIcon className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
}

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DATE_FORMAT = "yyyy-MM-dd";

function parseValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, DATE_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Pick a date",
  minDate,
  maxDate,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}) {
  const selected = parseValue(value);
  const [open, setOpen] = useState(false);
  const disabled =
    minDate && maxDate
      ? [{ before: minDate }, { after: maxDate }]
      : minDate
        ? { before: minDate }
        : maxDate
          ? { after: maxDate }
          : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "justify-start text-left font-normal hover:translate-y-0",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          {selected ? format(selected, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          disabled={disabled}
          onSelect={(date) => {
            onChange(date ? format(date, DATE_FORMAT) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

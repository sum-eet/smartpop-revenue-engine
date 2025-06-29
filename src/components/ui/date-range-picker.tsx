import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

interface DatePickerWithRangeProps {
  date: DateRange;
  onDateChange: (date: DateRange) => void;
  className?: string;
}

export const DatePickerWithRange: React.FC<DatePickerWithRangeProps> = ({
  date,
  onDateChange,
  className = ''
}) => {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    if (!date.from || (date.from && date.to)) {
      // Start new range
      onDateChange({
        from: selectedDate,
        to: selectedDate
      });
    } else if (selectedDate < date.from) {
      // Selected date is before from date, make it the new from date
      onDateChange({
        from: selectedDate,
        to: date.from
      });
      setOpen(false);
    } else {
      // Selected date is after from date, make it the to date
      onDateChange({
        from: date.from,
        to: selectedDate
      });
      setOpen(false);
    }
  };

  const formatDateRange = (): string => {
    if (!date.from) return 'Pick a date range';
    
    if (!date.to || date.from.getTime() === date.to.getTime()) {
      return format(date.from, 'MMM dd, yyyy');
    }
    
    return `${format(date.from, 'MMM dd, yyyy')} - ${format(date.to, 'MMM dd, yyyy')}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-start text-left font-normal ${className}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date.from}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
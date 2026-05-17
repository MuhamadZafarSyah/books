"use client";

import * as React from "react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CalendarIcon } from "lucide-react";

type DateTimePickerProps = {
  value?: string | Date;
  defaultValue?: string | Date;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-invalid"?: boolean;
};

export function DateTimePicker({
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  id,
  className,
  disabled,
  placeholder = "MM/DD/YYYY hh:mm aa",
  "aria-invalid": ariaInvalid,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    () => formatPayloadValue(defaultValue),
  );

  const inputValue =
    value !== undefined ? formatPayloadValue(value) : uncontrolledValue;
  const date = parseDateValue(inputValue);
  const hours = Array.from({ length: 12 }, (_, i) => 12 - i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const commitValue = React.useCallback(
    (nextDate: Date | undefined) => {
      const nextValue = nextDate ? formatPayloadValue(nextDate) : "";

      if (value === undefined) {
        setUncontrolledValue(nextValue);
      }

      onChange?.(nextValue);
    },
    [onChange, value],
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      commitValue(undefined);
      return;
    }

    const nextDate = new Date(selectedDate);

    if (date) {
      nextDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
    } else {
      nextDate.setHours(0, 0, 0, 0);
    }

    commitValue(nextDate);
  };

  const handleTimeChange = (
    type: "hour" | "minute" | "ampm",
    rawValue: string,
  ) => {
    if (!date) {
      return;
    }

    const nextDate = new Date(date);

    if (type === "hour") {
      const hour = Number.parseInt(rawValue, 10) % 12;
      const isPm = nextDate.getHours() >= 12;
      nextDate.setHours(hour + (isPm ? 12 : 0), nextDate.getMinutes(), 0, 0);
    } else if (type === "minute") {
      nextDate.setMinutes(Number.parseInt(rawValue, 10), 0, 0);
    } else {
      const hour = nextDate.getHours() % 12;
      nextDate.setHours(rawValue === "PM" ? hour + 12 : hour, nextDate.getMinutes(), 0, 0);
    }

    commitValue(nextDate);
  };

  return (
    <>
      {name ? <input type="hidden" name={name} value={inputValue} readOnly /> : null}

      <Popover
        open={isOpen}
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen);
          if (!nextOpen) {
            onBlur?.();
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "MM/dd/yyyy hh:mm aa") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="sm:flex">
            <Calendar mode="single" selected={date} onSelect={handleDateSelect} />
            <div className="flex flex-col divide-y sm:h-[300px] sm:flex-row sm:divide-x sm:divide-y-0">
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      type="button"
                      size="icon"
                      variant={
                        date && date.getHours() % 12 === hour % 12
                          ? "default"
                          : "ghost"
                      }
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() => handleTimeChange("hour", hour.toString())}
                    >
                      {hour}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {minutes.map((minute) => (
                    <Button
                      key={minute}
                      type="button"
                      size="icon"
                      variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() => handleTimeChange("minute", minute.toString())}
                    >
                      {minute.toString().padStart(2, "0")}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea>
                <div className="flex p-2 sm:flex-col">
                  {["AM", "PM"].map((ampm) => (
                    <Button
                      key={ampm}
                      type="button"
                      size="icon"
                      variant={
                        date &&
                        ((ampm === "AM" && date.getHours() < 12) ||
                          (ampm === "PM" && date.getHours() >= 12))
                          ? "default"
                          : "ghost"
                      }
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() => handleTimeChange("ampm", ampm)}
                    >
                      {ampm}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function parseDateValue(value: string | Date | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function formatPayloadValue(value: string | Date | undefined): string {
  const date = parseDateValue(value);

  if (!date) {
    return "";
  }

  return format(date, "yyyy-MM-dd'T'HH:mm");
}

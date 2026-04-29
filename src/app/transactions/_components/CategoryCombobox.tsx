"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
}

interface CategoryComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  emptyText?: string;
  includeEmpty?: boolean;
  emptyLabel?: string;
}

export function CategoryCombobox({
  value,
  onValueChange,
  options,
  placeholder,
  emptyText = "No options found",
  includeEmpty = true,
  emptyLabel = "— Uncategorized —",
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label));

  const displayLabel =
    value === "NONE"
      ? emptyLabel
      : (options.find((o) => o.value === value)?.label ?? placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left px-2 py-1 h-8 text-xs sm:text-sm"
        >
          <span className="truncate">{value ? displayLabel : placeholder}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-1 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {includeEmpty && (
              <CommandItem
                value="NONE"
                onSelect={() => {
                  onValueChange("NONE");
                  setOpen(false);
                }}
              >
                {emptyLabel}
              </CommandItem>
            )}
            {sorted.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

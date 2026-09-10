import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MedicationAutocompleteProps = {
  value: string[];
  onChange: (items: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
};

export function MedicationAutocomplete({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a medication...",
}: MedicationAutocompleteProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.length > 0
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) &&
          !value.some((v) => v.toLowerCase() === s.toLowerCase())
      )
    : [];

  const addItem = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const removeItem = (name: string) => {
    onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addItem(input);
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeItem(value[value.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-full border bg-background px-3 py-2",
          focused ? "border-primary/50 ring-2 ring-primary/20" : "border-border/70"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
          >
            {item}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {focused && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-48 w-full overflow-auto rounded-xl border bg-background py-1.5 shadow-lg">
          {filtered.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addItem(suggestion);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-primary/5"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

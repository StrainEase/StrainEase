import { Input } from "@/components/ui/input";
import { MEDICATION_NAME_MAX } from "@/lib/medications";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function MedicationAutocomplete({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a medication…",
}: {
  value: string[];
  onChange: (items: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on query
  const matches = query.trim().length >= 1
    ? suggestions
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
    : suggestions.slice(0, 6);

  const showDropdown = focused && matches.length > 0 && query.trim().length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.closest(".medication-autocomplete-root")?.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = () => {
    const trimmed = query.trim().slice(0, MEDICATION_NAME_MAX);
    if (!trimmed) return;
    // Check for duplicates (case-insensitive)
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setQuery("");
      setFocused(false);
      return;
    }
    onChange([...value, trimmed]);
    setQuery("");
    setFocused(false);
  };

  const handleRemove = (name: string) => {
    onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      setQuery("");
      setFocused(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (value.some((v) => v.toLowerCase() === suggestion.toLowerCase())) {
      return;
    }
    onChange([...value, suggestion]);
    setQuery("");
    setFocused(false);
  };

  return (
    <div className="medication-autocomplete-root space-y-2">
      {/* Chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary"
            >
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                onClick={() => handleRemove(name)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Clear all button */}
      {value.length > 1 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="size-3" />
          Clear all
        </button>
      )}

      {/* Input with dropdown */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-9 pr-10"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          tabIndex={-1}
        >
          <Plus className="size-4" />
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border/80 bg-popover py-1 shadow-lg">
            {matches.map((suggestion) => {
              const isSelected = value.some(
                (v) => v.toLowerCase() === suggestion.toLowerCase(),
              );
              return (
                <li key={suggestion}>
                  <button
                    type="button"
                    disabled={isSelected}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "cursor-not-allowed text-muted-foreground"
                        : "hover:bg-accent",
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                    {isSelected && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Already added
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

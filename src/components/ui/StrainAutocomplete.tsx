import { CATALOG, getPhotoURL } from "@/lib/strain-catalog";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useMemo, useState } from "react";

export type StrainAutocompleteItem = {
  name: string;
  type: string;
  thc: string;
};

export function StrainAutocomplete({
  value,
  onChange,
  onAdd,
  placeholder = "Search strains you've tried…",
}: {
  value: StrainAutocompleteItem[];
  onChange: (items: StrainAutocompleteItem[]) => void;
  onAdd?: (item: StrainAutocompleteItem) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter catalog strains based on query
  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const lowerQuery = query.toLowerCase();
    return CATALOG.filter((s) => s.name.toLowerCase().includes(lowerQuery))
      .slice(0, 8)
      .map((s) => ({
        name: s.name,
        type: s.type,
        thc: s.thcRange,
      }));
  }, [query]);

  const showDropdown = focused && matches.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.closest(".strain-autocomplete-root")?.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item: StrainAutocompleteItem) => {
    // Check for duplicates (case-insensitive)
    if (value.some((v) => v.name.toLowerCase() === item.name.toLowerCase())) {
      setQuery("");
      setFocused(false);
      return;
    }
    onChange([...value, item]);
    onAdd?.(item);
    setQuery("");
    setFocused(false);
    inputRef.current?.focus();
  };

  const handleRemove = (name: string) => {
    onChange(value.filter((v) => v.name.toLowerCase() !== name.toLowerCase()));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      setFocused(false);
    }
  };

  return (
    <div className="strain-autocomplete-root space-y-2">
      {/* Chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item.name}
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary"
            >
              <span className="flex items-center gap-1.5">
                {item.thc && (
                  <span className="text-[10px] font-semibold text-primary/70">
                    {item.thc}
                  </span>
                )}
                {item.name}
                <span className="text-[10px] capitalize text-primary/60">
                  ({item.type})
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                onClick={() => handleRemove(item.name)}
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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          tabIndex={-1}
        >
          <Plus className="size-4" />
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <ul
            ref={listRef}
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border/80 bg-popover py-1 shadow-lg"
          >
            {matches.map((item) => {
              const photoUrl = getPhotoURL(item.name);
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
                    onClick={() => handleSelect(item)}
                  >
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={item.name}
                        className="size-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded-lg bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold">{item.thc}</span>
                        <span className="capitalize">{item.type}</span>
                      </p>
                    </div>
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
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

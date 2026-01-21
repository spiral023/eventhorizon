import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getCompanyById, searchCompanies, type Company } from "@/data/companies";

interface CompanyAutocompleteProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function CompanyAutocomplete({
  value,
  onChange,
  label,
  placeholder = "Firma suchen...",
  helperText,
  id,
  disabled,
  className,
}: CompanyAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const selectedCompany = useMemo(() => getCompanyById(value), [value]);

  useEffect(() => {
    if (isFocused) return;
    setQuery(selectedCompany?.name ?? "");
  }, [selectedCompany, isFocused]);

  const suggestions = useMemo(() => {
    if (query.trim().length < 3) return [];
    return searchCompanies(query);
  }, [query]);

  const showSuggestions = isFocused && query.trim().length >= 3;

  const handleInputChange = (nextValue: string) => {
    setQuery(nextValue);
    if (selectedCompany && nextValue.trim() !== selectedCompany.name) {
      onChange(null);
    }
  };

  const handleSelect = (company: Company) => {
    onChange(company.id);
    setQuery(company.name);
    setIsFocused(false);
  };

  const handleClear = () => {
    setQuery("");
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id}>{label}</Label>
      )}
      <div className="relative">
        <Input
          id={id}
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="rounded-xl pr-10"
        />
        {query && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {showSuggestions && (
          <div className="absolute z-20 mt-2 w-full rounded-xl border border-border/70 bg-popover p-1 shadow-lg">
            {suggestions.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {suggestions.map((company) => {
                  const isSelected = company.id === selectedCompany?.id;
                  return (
                    <button
                      key={company.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10",
                        isSelected && "bg-primary/15"
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(company)}
                    >
                      <div>
                        <div className="font-medium text-foreground">{company.name}</div>
                        <div className="text-xs text-foreground/70">
                          {company.address}, {company.postalCode} {company.city} · {company.industry}
                        </div>
                      </div>
                      {isSelected && <Check className="mt-1 h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">Keine Treffer</div>
            )}
          </div>
        )}
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {selectedCompany && (
        <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {selectedCompany.address}, {selectedCompany.postalCode} {selectedCompany.city} · {selectedCompany.industry}
        </div>
      )}
    </div>
  );
}

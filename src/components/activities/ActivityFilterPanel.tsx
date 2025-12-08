import { useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { EventCategory, Region, Season, RiskLevel } from "@/types/domain";
import { CategoryLabels, RegionLabels, SeasonLabels, RiskLevelLabels } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface ActivityFilters {
  categories: EventCategory[];
  regions: Region[];
  seasons: Season[];
  riskLevels: RiskLevel[];
  priceRange: [number, number];
  groupSize: number | null;
  favoritesOnly: boolean;
}

interface ActivityFilterPanelProps {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
  onReset: () => void;
  className?: string;
}

export const defaultFilters: ActivityFilters = {
  categories: [],
  regions: [],
  seasons: [],
  riskLevels: [],
  priceRange: [0, 100],
  groupSize: null,
  favoritesOnly: false,
};

export function ActivityFilterPanel({ 
  filters, 
  onChange, 
  onReset,
  className 
}: ActivityFilterPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>(["category"]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const toggleCategory = (cat: EventCategory) => {
    const newCategories = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: newCategories });
  };

  const toggleRegion = (region: Region) => {
    const newRegions = filters.regions.includes(region)
      ? filters.regions.filter((r) => r !== region)
      : [...filters.regions, region];
    onChange({ ...filters, regions: newRegions });
  };

  const toggleSeason = (season: Season) => {
    const newSeasons = filters.seasons.includes(season)
      ? filters.seasons.filter((s) => s !== season)
      : [...filters.seasons, season];
    onChange({ ...filters, seasons: newSeasons });
  };

  const toggleRiskLevel = (level: RiskLevel) => {
    const newLevels = filters.riskLevels.includes(level)
      ? filters.riskLevels.filter((l) => l !== level)
      : [...filters.riskLevels, level];
    onChange({ ...filters, riskLevels: newLevels });
  };

  const activeFilterCount = 
    filters.categories.length +
    filters.regions.length +
    filters.seasons.length +
    filters.riskLevels.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 100 ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filter</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-xs h-7">
            <X className="h-3 w-3" />
            Zurücksetzen ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Favorites Toggle */}
      <Button
        variant={filters.favoritesOnly ? "default" : "secondary"}
        size="sm"
        className="w-full justify-start gap-2 rounded-xl"
        onClick={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
      >
        {filters.favoritesOnly && <Check className="h-4 w-4" />}
        Nur Favoriten
      </Button>

      {/* Category Filter */}
      <Collapsible open={openSections.includes("category")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("category")}
        >
          Kategorie
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("category") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CategoryLabels) as EventCategory[]).map((cat) => (
              <Badge
                key={cat}
                variant={filters.categories.includes(cat) ? "default" : "secondary"}
                className="cursor-pointer rounded-lg"
                onClick={() => toggleCategory(cat)}
              >
                {CategoryLabels[cat]}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Region Filter */}
      <Collapsible open={openSections.includes("region")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("region")}
        >
          Region
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("region") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RegionLabels) as Region[]).map((region) => (
              <Badge
                key={region}
                variant={filters.regions.includes(region) ? "default" : "secondary"}
                className="cursor-pointer rounded-lg"
                onClick={() => toggleRegion(region)}
              >
                {RegionLabels[region]}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Season Filter */}
      <Collapsible open={openSections.includes("season")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("season")}
        >
          Saison
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("season") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SeasonLabels) as Season[]).map((season) => (
              <Badge
                key={season}
                variant={filters.seasons.includes(season) ? "default" : "secondary"}
                className="cursor-pointer rounded-lg"
                onClick={() => toggleSeason(season)}
              >
                {SeasonLabels[season]}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Risk Level Filter */}
      <Collapsible open={openSections.includes("risk")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("risk")}
        >
          Risiko
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("risk") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RiskLevelLabels) as RiskLevel[]).map((level) => (
              <Badge
                key={level}
                variant={filters.riskLevels.includes(level) ? "default" : "secondary"}
                className="cursor-pointer rounded-lg"
                onClick={() => toggleRiskLevel(level)}
              >
                {RiskLevelLabels[level]}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible open={openSections.includes("price")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("price")}
        >
          Preis pro Person
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("price") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2">
          <div className="px-2">
            <Slider
              value={filters.priceRange}
              min={0}
              max={100}
              step={5}
              onValueChange={(value) => 
                onChange({ ...filters, priceRange: value as [number, number] })
              }
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{filters.priceRange[0]}€</span>
              <span>{filters.priceRange[1]}€+</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

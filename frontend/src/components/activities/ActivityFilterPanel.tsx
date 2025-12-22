import { useState } from "react";
import { X, ChevronDown, Clock, Users, Dumbbell, Brain, Sparkles, Footprints, Car, Sun, AlertTriangle, Euro, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { EventCategory, Region, Season, RiskLevel, PrimaryGoal } from "@/types/domain";
import { CategoryLabels, RegionLabels, SeasonLabels, RiskLevelLabels } from "@/types/domain";
import { cn } from "@/lib/utils";
import { getActiveFilterCount, formatDuration, type ActivityFilters, defaultFilters } from "@/utils/activityUtils";

interface ActivityFilterPanelProps {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
  onReset: () => void;
  className?: string;
}

const PrimaryGoalLabels: Record<PrimaryGoal, string> = {
  teambuilding: "Teambuilding",
  fun: "Spaß",
  reward: "Belohnung",
  celebration: "Feier",
  networking: "Networking",
};

export function ActivityFilterPanel({ 
  filters = defaultFilters, 
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
    const current = filters.categories || [];
    const newCategories = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    onChange({ ...filters, categories: newCategories });
  };

  const toggleRegion = (region: Region) => {
    const current = filters.regions || [];
    const newRegions = current.includes(region)
      ? current.filter((r) => r !== region)
      : [...current, region];
    onChange({ ...filters, regions: newRegions });
  };

  const toggleSeason = (season: Season) => {
    const current = filters.seasons || [];
    const newSeasons = current.includes(season)
      ? current.filter((s) => s !== season)
      : [...current, season];
    onChange({ ...filters, seasons: newSeasons });
  };

  const toggleRiskLevel = (level: RiskLevel) => {
    const current = filters.riskLevels || [];
    const newLevels = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    onChange({ ...filters, riskLevels: newLevels });
  };

  const togglePrimaryGoal = (goal: PrimaryGoal) => {
    const current = filters.primaryGoals || [];
    const newGoals = current.includes(goal)
      ? current.filter((g) => g !== goal)
      : [...current, goal];
    onChange({ ...filters, primaryGoals: newGoals });
  };

  const activeCount = getActiveFilterCount(filters);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-end">
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-xs h-7">
            <X className="h-3 w-3" />
            Zurücksetzen ({activeCount})
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
        <Heart className={cn("h-4 w-4", filters.favoritesOnly && "fill-current")} />
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
                variant={filters.categories?.includes(cat) ? "default" : "secondary"}
                className="cursor-pointer rounded-lg"
                onClick={() => toggleCategory(cat)}
              >
                {CategoryLabels[cat]}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Primary Goal Filter */}
      <Collapsible open={openSections.includes("goal")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("goal")}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ziel
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("goal") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PrimaryGoalLabels) as PrimaryGoal[]).map((goal) => (
              <Badge
                key={goal}
                variant={filters.primaryGoals?.includes(goal) ? "default" : "secondary"}
                className="cursor-pointer rounded-lg"
                onClick={() => togglePrimaryGoal(goal)}
              >
                {PrimaryGoalLabels[goal]}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Region Filter - Hidden for now as only OOE is available */}
      {/* <Collapsible open={openSections.includes("region")}>
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
                variant={filters.regions?.includes(region) ? "default" : "secondary"}
                className="cursor-pointer rounded-lg"
                onClick={() => toggleRegion(region)}
              >
                {RegionLabels[region]}
              </Badge>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible> */}

      {/* Season Filter */}
      <Collapsible open={openSections.includes("season")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("season")}
        >
          <span className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-primary" />
            Saison
          </span>
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
                variant={filters.seasons?.includes(season) ? "default" : "secondary"}
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
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Risiko
          </span>
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
                variant={filters.riskLevels?.includes(level) ? "default" : "secondary"}
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
          <span className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-primary" />
            Preis pro Person
          </span>
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
              max={200}
              step={10}
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

      {/* Group Size Range */}
      <Collapsible open={openSections.includes("groupSize")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("groupSize")}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Gruppengröße
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("groupSize") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2">
          <div className="px-2">
            <Slider
              value={filters.groupSizeRange}
              min={1}
              max={100}
              step={5}
              onValueChange={(value) => 
                onChange({ ...filters, groupSizeRange: value as [number, number] })
              }
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{filters.groupSizeRange[0]} Pers.</span>
              <span>{filters.groupSizeRange[1]}+ Pers.</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Duration Range */}
      <Collapsible open={openSections.includes("duration")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("duration")}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Dauer
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("duration") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2">
          <div className="px-2">
            <Slider
              value={filters.durationRange}
              min={0}
              max={480}
              step={30}
              onValueChange={(value) =>
                onChange({ ...filters, durationRange: value as [number, number] })
              }
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatDuration(filters.durationRange[0])}</span>
              <span>{formatDuration(filters.durationRange[1])}+</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Travel Time Driving */}
      <Collapsible open={openSections.includes("travelDriving")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("travelDriving")}
        >
          <span className="flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            Fahrtzeit vom Büro
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("travelDriving") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2">
          <div className="px-2">
            <Slider
              value={filters.travelTimeRange}
              min={0}
              max={60}
              step={5}
              onValueChange={(value) =>
                onChange({ ...filters, travelTimeRange: value as [number, number] })
              }
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{filters.travelTimeRange[0]} min</span>
              <span>{filters.travelTimeRange[1]}+ min</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Travel Time Walking */}
      <Collapsible open={openSections.includes("travelWalking")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("travelWalking")}
        >
          <span className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-primary" />
            Gehzeit vom Büro
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("travelWalking") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2">
          <div className="px-2">
            <Slider
              value={filters.travelTimeWalkingRange}
              min={0}
              max={60}
              step={5}
              onValueChange={(value) =>
                onChange({ ...filters, travelTimeWalkingRange: value as [number, number] })
              }
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{filters.travelTimeWalkingRange[0]} min</span>
              <span>{filters.travelTimeWalkingRange[1]}+ min</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Physical Intensity */}
      <Collapsible open={openSections.includes("physical")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("physical")}
        >
          <span className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Körperliche Intensität
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("physical") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2">
          <div className="px-2">
            <Slider
              value={filters.physicalIntensity}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => 
                onChange({ ...filters, physicalIntensity: value as [number, number] })
              }
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Leicht ({filters.physicalIntensity[0]})</span>
              <span>Intensiv ({filters.physicalIntensity[1]})</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Mental Challenge */}
      <Collapsible open={openSections.includes("mental")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("mental")}
        >
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Mentale Herausforderung
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("mental") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2">
          <div className="px-2">
            <Slider
              value={filters.mentalChallenge}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => 
                onChange({ ...filters, mentalChallenge: value as [number, number] })
              }
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Einfach ({filters.mentalChallenge[0]})</span>
              <span>Anspruchsvoll ({filters.mentalChallenge[1]})</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Teamwork Level */}
      {/* <Collapsible open={openSections.includes("teamwork")}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => toggleSection("teamwork")}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Teamwork-Level
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            openSections.includes("teamwork") && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2">
          <div className="px-2">
            <Slider
              value={filters.teamworkLevel}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => 
                onChange({ ...filters, teamworkLevel: value as [number, number] })
              }
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Individuell ({filters.teamworkLevel[0]})</span>
              <span>Sehr kooperativ ({filters.teamworkLevel[1]})</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible> */}

      {/* Quick Toggles */}
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground">Schnellfilter</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.weatherIndependent ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-lg"
            onClick={() => onChange({ ...filters, weatherIndependent: !filters.weatherIndependent })}
          >
            Wetterunabhängig
          </Button>
          <Button
            variant={filters.indoorOnly ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-lg"
            onClick={() => onChange({ ...filters, indoorOnly: !filters.indoorOnly, outdoorOnly: false })}
          >
            Nur Indoor
          </Button>
          <Button
            variant={filters.outdoorOnly ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-lg"
            onClick={() => onChange({ ...filters, outdoorOnly: !filters.outdoorOnly, indoorOnly: false })}
          >
            Nur Outdoor
          </Button>
        </div>
      </div>
    </div>
  );
}

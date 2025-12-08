import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, Euro, MapPin, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { CreateEventSchema, type CreateEventInput } from "@/schemas";
import { createEvent, getActivities, getFavoriteActivityIds } from "@/services/apiClient";
import type { Activity, Region, Season, EventTimeWindow } from "@/types/domain";
import { RegionLabels, SeasonLabels, MonthLabels, CategoryLabels, CategoryColors } from "@/types/domain";
import { cn } from "@/lib/utils";

type TimeWindowType = "season" | "month" | "weekRange" | "freeText";

export default function CreateEventPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [timeWindowType, setTimeWindowType] = useState<TimeWindowType>("month");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(CreateEventSchema),
    defaultValues: {
      name: "",
      description: "",
      budgetType: "per_person",
      budgetAmount: 50,
      locationRegion: "OOE",
      proposedActivityIds: [],
      votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      timeWindow: { type: "month", value: new Date().getMonth() + 2 },
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const [activitiesResult, favoritesResult] = await Promise.all([
        getActivities(),
        getFavoriteActivityIds(),
      ]);
      setActivities(activitiesResult.data);
      setFavoriteIds(favoritesResult.data);
      // Pre-select favorites
      setSelectedActivityIds(favoritesResult.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    form.setValue("proposedActivityIds", selectedActivityIds);
  }, [selectedActivityIds, form]);

  const toggleActivity = (activityId: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
  };

  const buildTimeWindow = (): EventTimeWindow => {
    const values = form.getValues();
    switch (timeWindowType) {
      case "season":
        return { type: "season", value: (values as any).seasonValue || "summer" };
      case "month":
        return { type: "month", value: (values as any).monthValue || new Date().getMonth() + 2 };
      case "weekRange":
        return { 
          type: "weekRange", 
          fromWeek: (values as any).fromWeek || 1, 
          toWeek: (values as any).toWeek || 4 
        };
      case "freeText":
        return { type: "freeText", value: (values as any).freeTextValue || "" };
      default:
        return { type: "month", value: new Date().getMonth() + 2 };
    }
  };

  const onSubmit = async (data: CreateEventInput) => {
    if (!roomId) return;
    
    setSubmitting(true);
    try {
      const timeWindow = buildTimeWindow();
      const result = await createEvent(roomId, { ...data, timeWindow });
      
      toast({
        title: "Event erstellt!",
        description: `"${result.data.name}" wurde erfolgreich angelegt.`,
      });
      
      navigate(`/rooms/${roomId}/events/${result.data.id}`);
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Event konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary/30 rounded animate-pulse" />
        <div className="h-96 bg-secondary/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Sort activities: favorites first
  const sortedActivities = [...activities].sort((a, b) => {
    const aFav = favoriteIds.includes(a.id) ? 1 : 0;
    const bFav = favoriteIds.includes(b.id) ? 1 : 0;
    return bFav - aFav;
  });

  return (
    <div className="max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 mb-4 -ml-2"
        onClick={() => navigate(`/rooms/${roomId}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Raum
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Neues Event erstellen</h1>
        <p className="text-muted-foreground mt-1">
          Plane ein neues Teamevent mit Aktivitätsauswahl und Abstimmung.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <Card className="bg-card/60 border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Grundinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event-Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="z.B. Sommer-Teamevent 2024" 
                        className="rounded-xl"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Worum geht es bei diesem Event?"
                        className="rounded-xl resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Time & Location */}
          <Card className="bg-card/60 border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Zeit & Ort
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Time Window Type */}
              <div>
                <Label className="mb-3 block">Grober Zeitraum</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant={timeWindowType === "month" ? "default" : "secondary"}
                    className="rounded-xl h-auto py-3"
                    onClick={() => setTimeWindowType("month")}
                  >
                    Monat
                  </Button>
                  <Button
                    type="button"
                    variant={timeWindowType === "season" ? "default" : "secondary"}
                    className="rounded-xl h-auto py-3"
                    onClick={() => setTimeWindowType("season")}
                  >
                    Saison
                  </Button>
                  <Button
                    type="button"
                    variant={timeWindowType === "weekRange" ? "default" : "secondary"}
                    className="rounded-xl h-auto py-3"
                    onClick={() => setTimeWindowType("weekRange")}
                  >
                    KW-Bereich
                  </Button>
                  <Button
                    type="button"
                    variant={timeWindowType === "freeText" ? "default" : "secondary"}
                    className="rounded-xl h-auto py-3"
                    onClick={() => setTimeWindowType("freeText")}
                  >
                    Freitext
                  </Button>
                </div>
              </div>

              {/* Time Window Value */}
              <div>
                {timeWindowType === "month" && (
                  <Select 
                    defaultValue={String(new Date().getMonth() + 2)}
                    onValueChange={(v) => form.setValue("timeWindow", { type: "month", value: parseInt(v) } as any)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Monat wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MonthLabels).map(([num, name]) => (
                        <SelectItem key={num} value={num}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {timeWindowType === "season" && (
                  <Select 
                    defaultValue="summer"
                    onValueChange={(v) => form.setValue("timeWindow", { type: "season", value: v } as any)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Saison wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SeasonLabels).map(([key, name]) => (
                        <SelectItem key={key} value={key}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {timeWindowType === "freeText" && (
                  <Input 
                    placeholder="z.B. 'Nach der Konferenz' oder 'Anfang Q3'"
                    className="rounded-xl"
                    onChange={(e) => form.setValue("timeWindow", { type: "freeText", value: e.target.value } as any)}
                  />
                )}
              </div>

              {/* Voting Deadline */}
              <FormField
                control={form.control}
                name="votingDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abstimmungs-Deadline *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        className="rounded-xl"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Region */}
              <FormField
                control={form.control}
                name="locationRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Region wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(RegionLabels).map(([key, name]) => (
                          <SelectItem key={key} value={key}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Budget */}
          <Card className="bg-card/60 border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="h-5 w-5 text-primary" />
                Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="budgetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget-Typ</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={field.value === "per_person" ? "default" : "secondary"}
                          className="rounded-xl h-auto py-4 flex-col"
                          onClick={() => field.onChange("per_person")}
                        >
                          <span className="font-medium">Pro Person</span>
                          <span className="text-xs opacity-70">z.B. 50€/Person</span>
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === "total" ? "default" : "secondary"}
                          className="rounded-xl h-auto py-4 flex-col"
                          onClick={() => field.onChange("total")}
                        >
                          <span className="font-medium">Gesamtbudget</span>
                          <span className="text-xs opacity-70">z.B. 1000€ total</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budgetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Betrag (€) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min={0}
                        step={10}
                        className="rounded-xl"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Activity Selection */}
          <Card className="bg-card/60 border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Aktivitäten auswählen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Wähle mindestens eine Aktivität für die Abstimmung. Favoriten sind vorausgewählt.
              </p>
              
              {form.formState.errors.proposedActivityIds && (
                <p className="text-sm text-destructive mb-4">
                  {form.formState.errors.proposedActivityIds.message}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {sortedActivities.map((activity) => {
                  const isSelected = selectedActivityIds.includes(activity.id);
                  const isFavorite = favoriteIds.includes(activity.id);
                  
                  return (
                    <div
                      key={activity.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      )}
                      onClick={() => toggleActivity(activity.id)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <img 
                        src={activity.imageUrl} 
                        alt={activity.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{activity.title}</p>
                          {isFavorite && (
                            <span className="text-xs text-destructive">♥</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{activity.estPricePerPerson}€ · {activity.duration}</p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                {selectedActivityIds.length} Aktivität{selectedActivityIds.length !== 1 ? "en" : ""} ausgewählt
              </p>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={() => navigate(`/rooms/${roomId}`)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={submitting}
            >
              {submitting ? "Erstellen..." : "Event erstellen"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
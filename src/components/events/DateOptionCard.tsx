import { Check, X, HelpCircle, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DateOption, DateResponseType } from "@/types/domain";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DateOptionCardProps {
  dateOption: DateOption;
  currentUserId: string;
  onRespond: (dateOptionId: string, response: DateResponseType, contribution?: number) => void;
  isLoading?: boolean;
  isFinal?: boolean;
}

export function DateOptionCard({ 
  dateOption, 
  currentUserId, 
  onRespond,
  isLoading,
  isFinal
}: DateOptionCardProps) {
  const [contribution, setContribution] = useState<string>("");
  
  const yesCount = dateOption.responses.filter((r) => r.response === "yes").length;
  const maybeCount = dateOption.responses.filter((r) => r.response === "maybe").length;
  const noCount = dateOption.responses.filter((r) => r.response === "no").length;
  const totalContributions = dateOption.responses.reduce((sum, r) => sum + (r.contribution || 0), 0);
  
  const userResponse = dateOption.responses.find((r) => r.userId === currentUserId);

  const formattedDate = new Date(dateOption.date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleRespond = (response: DateResponseType) => {
    const contrib = contribution ? parseFloat(contribution) : undefined;
    onRespond(dateOption.id, response, contrib);
  };

  return (
    <Card className={cn(
      "bg-card/60 border-border/50 rounded-2xl transition-all",
      isFinal && "ring-2 ring-primary border-primary/50"
    )}>
      <CardContent className="p-5">
        {/* Date Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-lg">{formattedDate}</h4>
            {dateOption.startTime && (
              <p className="text-sm text-muted-foreground">
                {dateOption.startTime}
                {dateOption.endTime && ` – ${dateOption.endTime}`} Uhr
              </p>
            )}
          </div>
          {isFinal && (
            <div className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              Finaler Termin
            </div>
          )}
        </div>

        {/* Response Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-success">
            <Check className="h-4 w-4" />
            <span className="font-medium">{yesCount} Zusagen</span>
          </div>
          <div className="flex items-center gap-1.5 text-warning">
            <HelpCircle className="h-4 w-4" />
            <span className="font-medium">{maybeCount} Vielleicht</span>
          </div>
          <div className="flex items-center gap-1.5 text-destructive">
            <X className="h-4 w-4" />
            <span className="font-medium">{noCount} Absagen</span>
          </div>
          {totalContributions > 0 && (
            <div className="flex items-center gap-1.5 text-primary ml-auto">
              <Euro className="h-4 w-4" />
              <span className="font-medium">{totalContributions}€ gesammelt</span>
            </div>
          )}
        </div>

        {/* Response Buttons */}
        {!isFinal && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Button
              variant={userResponse?.response === "yes" ? "default" : "secondary"}
              size="sm"
              className={cn(
                "gap-1.5 rounded-lg",
                userResponse?.response === "yes" && "bg-success hover:bg-success/90"
              )}
              onClick={() => handleRespond("yes")}
              disabled={isLoading}
            >
              <Check className="h-4 w-4" />
              Zusagen
            </Button>
            <Button
              variant={userResponse?.response === "maybe" ? "default" : "secondary"}
              size="sm"
              className={cn(
                "gap-1.5 rounded-lg",
                userResponse?.response === "maybe" && "bg-warning hover:bg-warning/90"
              )}
              onClick={() => handleRespond("maybe")}
              disabled={isLoading}
            >
              <HelpCircle className="h-4 w-4" />
              Vielleicht
            </Button>
            <Button
              variant={userResponse?.response === "no" ? "default" : "secondary"}
              size="sm"
              className={cn(
                "gap-1.5 rounded-lg",
                userResponse?.response === "no" && "bg-destructive hover:bg-destructive/90"
              )}
              onClick={() => handleRespond("no")}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
              Absagen
            </Button>

            {/* Contribution Input */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Beitrag:</span>
              <div className="relative w-24">
                <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="5"
                  placeholder="0"
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                  className="pl-8 h-9 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Responders */}
        {dateOption.responses.length > 0 && (
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Antworten:</p>
            <div className="flex flex-wrap gap-2">
              {dateOption.responses.map((response) => (
                <div
                  key={response.userId}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-lg text-xs",
                    response.response === "yes" && "bg-success/10 text-success",
                    response.response === "maybe" && "bg-warning/10 text-warning",
                    response.response === "no" && "bg-destructive/10 text-destructive"
                  )}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {response.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{response.userName}</span>
                  {response.contribution && (
                    <span className="text-primary">+{response.contribution}€</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { ThumbsUp, ThumbsDown, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Activity, ActivityVote, VoteType } from "@/types/domain";
import { CategoryLabels, CategoryColors, RegionLabels } from "@/types/domain";
import { cn } from "@/lib/utils";

interface VotingCardProps {
  activity: Activity;
  votes: ActivityVote | undefined;
  currentUserId: string;
  onVote: (activityId: string, vote: VoteType) => void;
  isLoading?: boolean;
}

export function VotingCard({ 
  activity, 
  votes, 
  currentUserId, 
  onVote,
  isLoading 
}: VotingCardProps) {
  const forVotes = votes?.votes.filter((v) => v.vote === "for").length || 0;
  const againstVotes = votes?.votes.filter((v) => v.vote === "against").length || 0;
  const abstainVotes = votes?.votes.filter((v) => v.vote === "abstain").length || 0;
  const totalVotes = forVotes + againstVotes + abstainVotes;
  
  const userVote = votes?.votes.find((v) => v.userId === currentUserId)?.vote;
  const userIsFor = userVote === "for";
  const userIsAgainst = userVote === "against";

  const score = forVotes - againstVotes;

  return (
    <Card className="bg-card/60 border-border/50 rounded-2xl overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0">
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
          <Badge 
            className={cn(
              "absolute top-3 left-3 rounded-lg font-medium shadow-md",
              "bg-card/95 backdrop-blur-sm border border-border/50",
              CategoryColors[activity.category]
            )}
          >
            {CategoryLabels[activity.category]}
          </Badge>
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-4 sm:p-5">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{activity.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {activity.shortDescription}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{RegionLabels[activity.locationRegion]}</span>
                <span>·</span>
                <span>ab {activity.estPricePerPerson}€ p.P.</span>
                <span>·</span>
                <span>{activity.duration}</span>
              </div>
            </div>

            {/* Voting Section */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between gap-4">
                {/* Vote Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={userVote === "for" ? "default" : "secondary"}
                    size="sm"
                    className={cn(
                      "gap-1.5 rounded-lg",
                      userVote === "for" && "bg-success hover:bg-success/90"
                    )}
                    onClick={() => onVote(activity.id, "for")}
                    disabled={isLoading}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Dafür
                    {userVote === "for" && <Check className="h-3 w-3 ml-1" />}
                  </Button>
                  <Button
                    variant={userVote === "against" ? "default" : "secondary"}
                    size="sm"
                    className={cn(
                      "gap-1.5 rounded-lg",
                      userVote === "against" && "bg-destructive hover:bg-destructive/90"
                    )}
                    onClick={() => onVote(activity.id, "against")}
                    disabled={isLoading}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Dagegen
                    {userVote === "against" && <Check className="h-3 w-3 ml-1" />}
                  </Button>
                  <Button
                    variant={userVote === "abstain" ? "default" : "ghost"}
                    size="sm"
                    className="gap-1.5 rounded-lg"
                    onClick={() => onVote(activity.id, "abstain")}
                    disabled={isLoading}
                  >
                    <Minus className="h-4 w-4" />
                    Enthaltung
                  </Button>
                </div>

                {/* Score */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-medium", userIsFor ? "text-success" : "text-muted-foreground")}>{forVotes}</span>
                    <ThumbsUp className={cn("h-3.5 w-3.5", userIsFor ? "text-success" : "text-muted-foreground")}/>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-medium", userIsAgainst ? "text-destructive" : "text-muted-foreground")}>{againstVotes}</span>
                    <ThumbsDown className={cn("h-3.5 w-3.5", userIsAgainst ? "text-destructive" : "text-muted-foreground")}/>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-secondary">
                    <span
                      className={cn(
                        "font-semibold",
                        userIsFor && "text-success",
                        userIsAgainst && "text-destructive",
                        !userVote && "text-muted-foreground"
                      )}
                    >
                      {score > 0 ? `+${score}` : score}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

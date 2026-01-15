import type { ReactNode } from "react";
import { ThumbsUp, ThumbsDown, Minus, Check, Trophy, Heart, Star, Globe, Mail, MapPin, CalendarCheck, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Activity, ActivityVote, VoteType, EventParticipant } from "@/types/domain";
import { CategoryLabels, CategoryColors, RegionLabels } from "@/types/domain";
import { cn } from "@/lib/utils";

interface VotingCardProps {
  activity: Activity;
  votes: ActivityVote | undefined;
  currentUserId: string;
  onVote: (activityId: string, vote: VoteType) => void;
  isLoading?: boolean;
  disabled?: boolean;
  isOwner?: boolean;
  onSelect?: () => void;
  rank?: number;
  participants?: EventParticipant[];
}

export function VotingCard({
  activity,
  votes,
  currentUserId,
  onVote,
  isLoading,
  disabled,
  isOwner,
  onSelect,
  rank,
  participants = [],
}: VotingCardProps) {
  const forVotes = votes?.votes.filter((v) => v.vote === "for").length || 0;
  const againstVotes = votes?.votes.filter((v) => v.vote === "against").length || 0;
  const abstainVotes = votes?.votes.filter((v) => v.vote === "abstain").length || 0;
  
  const userVote = votes?.votes.find((v) => v.userId === currentUserId)?.vote;
  const userIsFor = userVote === "for";
  const userIsAgainst = userVote === "against";

  const score = forVotes - againstVotes;
  const showProminentButton = isOwner && !disabled && score > 0 && rank !== undefined && rank <= 3;

  const forVoterIds = votes?.votes.filter(v => v.vote === "for").map(v => v.userId) || [];
  const againstVoterIds = votes?.votes.filter(v => v.vote === "against").map(v => v.userId) || [];

  const forVoters = participants.filter(p => forVoterIds.includes(p.userId));
  const againstVoters = participants.filter(p => againstVoterIds.includes(p.userId));
  const favoritesCount = typeof activity.favoritesInRoomCount === "number" ? activity.favoritesInRoomCount : undefined;

  const formatNumber = (value: number, options: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat("de-DE", options).format(value);

  const priceLabel =
    typeof activity.estPricePerPerson === "number"
      ? `ab ${formatNumber(activity.estPricePerPerson, {
          maximumFractionDigits: activity.estPricePerPerson % 1 === 0 ? 0 : 1,
        })} € p.P.`
      : undefined;

  const durationLabel =
    typeof activity.typicalDurationHours === "number"
      ? `ca. ${formatNumber(activity.typicalDurationHours, {
          minimumFractionDigits: activity.typicalDurationHours % 1 === 0 ? 0 : 1,
          maximumFractionDigits: 1,
        })}h`
      : undefined;

  const ratingLabel =
    typeof activity.externalRating === "number"
      ? formatNumber(activity.externalRating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : undefined;

  const priceComment = activity.priceComment?.trim();

  const mapsQuery = [activity.title, activity.locationAddress ?? activity.locationCity ?? RegionLabels[activity.locationRegion]]
    .filter(Boolean)
    .join(" ");
  const mapsUrl = (activity.locationAddress || activity.locationCity)
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : undefined;

  const links: Array<{ href: string; label: string; icon: JSX.Element; isMail?: boolean }> = [];

  if (activity.website) {
    links.push({ href: activity.website, label: "Website", icon: <Globe className="h-4 w-4" /> });
  }
  if (activity.contactEmail) {
    links.push({
      href: `mailto:${activity.contactEmail}`,
      label: "E-Mail",
      icon: <Mail className="h-4 w-4" />,
      isMail: true,
    });
  }
  if (mapsUrl) {
    links.push({ href: mapsUrl, label: "Standort (Google Maps)", icon: <MapPin className="h-4 w-4" /> });
  }
  if (activity.reservationUrl) {
    links.push({ href: activity.reservationUrl, label: "Reservieren", icon: <CalendarCheck className="h-4 w-4" /> });
  }
  if (activity.menuUrl) {
    links.push({ href: activity.menuUrl, label: "Speisekarte", icon: <UtensilsCrossed className="h-4 w-4" /> });
  }

  const metaItems: Array<{ key: string; content: ReactNode; tooltip: string; className?: string }> = [];

  if (favoritesCount !== undefined) {
    metaItems.push({
      key: "favorites",
      className: "gap-1 text-pink-500 font-medium",
      tooltip: "Favoriten im Raum",
      content: (
        <>
          <Heart className="h-3.5 w-3.5 fill-current" />
          <span>{favoritesCount}</span>
        </>
      ),
    });
  }

  if (priceLabel) {
    metaItems.push({
      key: "price",
      className: "gap-1.5",
      tooltip: "Preis pro Person",
      content: <span>{priceLabel}</span>,
    });
  }

  if (durationLabel) {
    metaItems.push({
      key: "duration",
      className: "gap-1.5",
      tooltip: "Typische Dauer",
      content: <span>{durationLabel}</span>,
    });
  }

  if (ratingLabel) {
    metaItems.push({
      key: "rating",
      className: "gap-1.5",
      tooltip: "Externes Rating",
      content: (
        <>
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span>{ratingLabel}</span>
        </>
      ),
    });
  }

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
          {rank && rank <= 3 && (
             <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-white font-bold shadow-lg ring-2 ring-white/50">
               #{rank}
             </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-4 sm:p-5">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">
                <Link
                  to={`/activities/${activity.slug}`}
                  className="transition-colors hover:text-primary"
                >
                  {activity.title}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {activity.shortDescription}
              </p>
              {(metaItems.length > 0 || links.length > 0) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start text-center sm:text-left text-xs text-muted-foreground gap-x-3 gap-y-1 sm:gap-x-0">
                  {metaItems.map((item, index) => (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "inline-flex items-center",
                            index > 0 &&
                              "sm:before:mx-2 sm:before:text-muted-foreground/60 sm:before:content-['•']",
                            item.className
                          )}
                        >
                          {item.content}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{item.tooltip}</TooltipContent>
                    </Tooltip>
                  ))}
                  {links.length > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center sm:justify-start gap-1 w-full sm:w-auto mt-1 sm:mt-0",
                        metaItems.length > 0 &&
                          "sm:before:mx-2 sm:before:text-muted-foreground/60 sm:before:content-['•']"
                      )}
                    >
                      {links.map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          target={link.isMail ? undefined : "_blank"}
                          rel={link.isMail ? undefined : "noopener noreferrer"}
                          aria-label={link.label}
                          title={link.label}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/80 transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                          {link.icon}
                        </a>
                      ))}
                    </span>
                  )}
                </div>
              )}
              {priceComment && (
                <p className="mt-1 text-xs italic text-muted-foreground break-words line-clamp-none sm:line-clamp-1 text-center sm:text-left">
                  {priceComment}
                </p>
              )}
            </div>

            {/* Voting Section */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Vote Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={userVote === "for" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-1.5 rounded-lg border-2 transition-all",
                      userVote === "for"
                        ? "!border-green-600 !bg-green-600 !text-white hover:!bg-green-700 shadow-sm"
                        : "border-border bg-secondary/70 text-foreground hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-600"
                    )}
                    type="button"
                    onClick={() => onVote(activity.id, "for")}
                    disabled={isLoading || disabled}
                    aria-pressed={userVote === "for"}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Dafür
                    {userVote === "for" && <Check className="h-3 w-3 ml-1" />}
                  </Button>
                  <Button
                    variant={userVote === "against" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-1.5 rounded-lg border-2 transition-all",
                      userVote === "against"
                        ? "!border-red-600 !bg-red-600 !text-white hover:!bg-red-700 shadow-sm"
                        : "border-border bg-secondary/70 text-foreground hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-600"
                    )}
                    type="button"
                    onClick={() => onVote(activity.id, "against")}
                    disabled={isLoading || disabled}
                    aria-pressed={userVote === "against"}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Dagegen
                    {userVote === "against" && <Check className="h-3 w-3 ml-1" />}
                  </Button>
                  <Button
                    variant={userVote === "abstain" ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-1.5 rounded-lg border-2 transition-all",
                      userVote === "abstain"
                        ? "!border-gray-500 !bg-gray-500 !text-white hover:!bg-gray-600 shadow-sm"
                        : "border-border bg-secondary/70 text-foreground hover:border-gray-500/40 hover:bg-gray-500/10 hover:text-gray-600"
                    )}
                    type="button"
                    onClick={() => onVote(activity.id, "abstain")}
                    disabled={isLoading || disabled}
                    aria-pressed={userVote === "abstain"}
                  >
                    <Minus className="h-4 w-4" />
                    Enthaltung
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Score */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                        <span className={cn("font-medium", userIsFor ? "text-success" : "text-muted-foreground")}>{forVotes}</span>
                        <ThumbsUp className={cn("h-3.5 w-3.5", userIsFor ? "text-success" : "text-muted-foreground")}/>
                        <div className="flex -space-x-2 overflow-hidden">
                          {forVoters.map((voter) => (
                            <Tooltip key={voter.userId}>
                              <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 border-2 border-white">
                                  <AvatarImage src={voter.avatarUrl} />
                                  <AvatarFallback>{voter.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>{voter.userName}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={cn("font-medium", userIsAgainst ? "text-destructive" : "text-muted-foreground")}>{againstVotes}</span>
                        <ThumbsDown className={cn("h-3.5 w-3.5", userIsAgainst ? "text-destructive" : "text-muted-foreground")}/>
                        <div className="flex -space-x-2 overflow-hidden">
                          {againstVoters.map((voter) => (
                            <Tooltip key={voter.userId}>
                              <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 border-2 border-white">
                                  <AvatarImage src={voter.avatarUrl} />
                                  <AvatarFallback>{voter.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>{voter.userName}</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
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

              {/* Prominent Owner Selection Button */}
              {showProminentButton && onSelect && (
                <div className="mt-4 pt-4 border-t border-border/50">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                                <Trophy className="mr-2 h-4 w-4" />
                                Diese Aktivität auswählen
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Aktivität auswählen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Möchtest du "{activity.title}" als finale Aktivität festlegen?
                                    Das Event wechselt damit in die Terminfindungs-Phase.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={onSelect}>Bestätigen</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

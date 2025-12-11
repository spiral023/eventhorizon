import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Send, MessageSquare, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { getEventComments, createEventComment } from "@/services/apiClient";
import type { EventComment, EventPhase } from "@/types/domain";
import { cn } from "@/lib/utils";

interface PhaseCommentsProps {
  eventId: string;
  phase: EventPhase;
}

export const PhaseComments: React.FC<PhaseCommentsProps> = ({ eventId, phase }) => {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const fetchComments = async () => {
    setIsLoading(true);
    const { data, error } = await getEventComments(eventId, phase, 0, 50);
    if (data) {
      setComments(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [eventId, phase]);

  const handleSend = async () => {
    if (!newComment.trim()) return;
    
    setIsSending(true);
    const { data, error } = await createEventComment(eventId, newComment, phase);
    if (data) {
      setComments([data, ...comments]);
      setNewComment("");
    } else {
      toast({
        title: "Fehler",
        description: "Kommentar konnte nicht gesendet werden.",
        variant: "destructive",
      });
    }
    setIsSending(false);
  };

  const CommentItem = ({ comment, isLatest = false }: { comment: EventComment, isLatest?: boolean }) => (
    <div className={cn("flex gap-3", isLatest ? "items-start" : "items-center opacity-90")}>
      <Avatar className={cn("border border-border", isLatest ? "h-10 w-10" : "h-8 w-8")}>
        <AvatarImage src={comment.userAvatar} />
        <AvatarFallback className="text-[10px]">
          {comment.userName?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{comment.userName}</span>
          <span className="text-xs text-muted-foreground">
            vor {formatDistanceToNow(new Date(comment.createdAt), { locale: de })}
          </span>
        </div>
        <p className={cn("text-sm text-foreground leading-relaxed", !isLatest && "text-muted-foreground")}>
          {comment.content}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Latest Comment (or Empty State) */}
      {isLoading && comments.length === 0 ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
            <CommentItem comment={comments[0]} isLatest />
          </div>
          
          {comments.length > 1 && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mb-2">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-2" />
                      Weniger anzeigen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-2" />
                      {comments.length - 1} ältere Kommentare anzeigen
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pl-2 border-l-2 border-border/50 ml-4 mb-4">
                {comments.slice(1).map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Noch keine Nachrichten in dieser Phase.
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Nachricht schreiben..."
          className="min-h-[40px] h-[40px] resize-none py-2 text-sm bg-background"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button 
          size="icon" 
          className="h-[40px] w-[40px] shrink-0" 
          onClick={handleSend}
          disabled={!newComment.trim() || isSending}
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Loader2,
  Trash2,
  MoreVertical,
  CornerDownRight,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createActivityComment, deleteActivityComment } from "@/services/apiClient";
import type { ActivityComment } from "@/types/domain";
import { Link } from "react-router-dom";

interface ActivityCommentsProps {
  slug: string;
  initialComments?: ActivityComment[];
  onCountChange?: (count: number) => void;
}

export const ActivityComments: React.FC<ActivityCommentsProps> = ({
  slug,
  initialComments = [],
  onCountChange,
}) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<ActivityComment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!slug || !newComment.trim()) return;

    setSubmitting(true);
    const result = await createActivityComment(slug, newComment);

    if (result.error) {
      toast.error(result.error.message || "Kommentar konnte nicht gesendet werden");
    } else if (result.data) {
      const updatedComments = [result.data, ...comments];
      setComments(updatedComments);
      setNewComment("");
      onCountChange?.(updatedComments.length);
      toast.success("Kommentar gesendet");
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    // Optimistic UI update could be risky if API fails, but better UX.
    // For safety, we'll wait for API but show loading state.
    const confirmDelete = window.confirm("Diesen Kommentar löschen?");
    if (!confirmDelete) return;

    setDeletingId(commentId);
    const result = await deleteActivityComment(slug, commentId);

    if (result.error) {
      toast.error(result.error.message || "Kommentar konnte nicht gelöscht werden");
    } else {
      const updatedComments = comments.filter((c) => c.id !== commentId);
      setComments(updatedComments);
      onCountChange?.(updatedComments.length);
      toast.success("Kommentar gelöscht");
    }
    setDeletingId(null);
  };

  return (
    <Card className="border-border/50 rounded-2xl overflow-hidden shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
        <CardTitle className="text-lg flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
             <MessageSquare className="h-5 w-5" />
          </div>
          Community
          {comments.length > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-full px-2.5 bg-secondary text-secondary-foreground">
              {comments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Input Section */}
        <div className="p-4 sm:p-6 bg-background/50">
          {user ? (
            <div className="flex gap-4">
              <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm flex-shrink-0">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="relative">
                    <Textarea
                    placeholder="Was denkst du über diese Aktivität?"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px] w-full resize-none rounded-xl border-border/60 bg-background focus:border-primary/50 focus:ring-primary/20 shadow-sm transition-all text-sm placeholder:text-muted-foreground/70"
                    />
                     <div className="absolute bottom-2 right-2">
                        <span className="text-[10px] text-muted-foreground/50">{newComment.length}/500</span>
                     </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={!newComment.trim() || submitting}
                    className="rounded-xl px-5 font-medium transition-all"
                    size="sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sende...
                      </>
                    ) : (
                      <>
                        Kommentieren
                        <Send className="h-3.5 w-3.5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
             <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Deine Meinung zählt</h3>
                <p className="text-sm text-muted-foreground mb-4">Melde dich an, um mitzudiskutieren und Fragen zu stellen.</p>
                <Button asChild variant="outline" className="rounded-xl gap-2">
                  <Link to="/login">
                    Anmelden
                  </Link>
                </Button>
            </div>
          )}
        </div>

        {/* Separator and Comments List - Only shown if there are comments */}
        {comments.length > 0 && (
          <>
            <Separator className="opacity-50" />
            <div className="bg-muted/5 p-4 sm:p-6">
              <div className="space-y-6">
                <AnimatePresence initial={false} mode="popLayout">
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      className="group relative flex gap-4"
                    >
                      <Avatar className="h-10 w-10 border border-border/50 shadow-sm mt-0.5 flex-shrink-0 transition-transform group-hover:scale-105">
                        <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
                          {comment.userName?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">
                                      {comment.userName}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                                      • {formatDistanceToNow(new Date(comment.createdAt.endsWith('Z') ? comment.createdAt : `${comment.createdAt}Z`), { addSuffix: true, locale: de })}
                                  </span>
                              </div>
                              
                              {comment.userId === user?.id && (
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 text-muted-foreground hover:text-foreground">
                                              <MoreVertical className="h-3.5 w-3.5" />
                                              <span className="sr-only">Optionen</span>
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-[160px]">
                                          <DropdownMenuItem 
                                              className="text-destructive focus:text-destructive cursor-pointer gap-2"
                                              onClick={() => handleDelete(comment.id)}
                                          >
                                              {deletingId === comment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                              Löschen
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              )}
                          </div>

                        <div className={cn(
                          "rounded-2xl rounded-tl-sm p-4 text-sm leading-relaxed shadow-sm transition-colors",
                           comment.userId === user?.id 
                              ? "bg-primary/5 border border-primary/10 text-foreground"
                              : "bg-white dark:bg-card border border-border/40 text-muted-foreground hover:text-foreground"
                        )}>
                          {comment.content}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

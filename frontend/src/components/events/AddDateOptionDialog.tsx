import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { DateOption } from "@/types/domain";

interface AddDateOptionDialogProps {
  onDateAdded: (dateOption: DateOption) => void;
  trigger?: React.ReactNode;
}

export function AddDateOptionDialog({ onDateAdded, trigger }: AddDateOptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Bitte wähle ein Datum");
      return;
    }

    setLoading(true);
    try {
      const newDateOption: DateOption = {
        id: `date-${Date.now()}`,
        date: new Date(date).toISOString(),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        responses: [],
      };

      onDateAdded(newDateOption);
      toast.success("Terminvorschlag hinzugefügt!");
      setOpen(false);
      setDate("");
      setStartTime("");
      setEndTime("");
    } catch (error) {
      toast.error("Fehler beim Hinzufügen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Terminvorschlag hinzufügen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Neuer Terminvorschlag
          </DialogTitle>
          <DialogDescription>
            Füge einen neuen Terminvorschlag für das Event hinzu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-time">Startzeit (optional)</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-time">Endzeit (optional)</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl">
              {loading ? "Hinzufügen..." : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
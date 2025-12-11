import { Link } from "react-router-dom";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

interface GuestAccessNoticeProps {
  title: string;
  description: string;
  loginState?: unknown;
}

export function GuestAccessNotice({ title, description, loginState }: GuestAccessNoticeProps) {
  return (
    <EmptyState
      icon={Lock}
      title={title}
      description={description}
      action={
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="secondary" className="rounded-xl">
            <Link to="/login" state={loginState}>
              <LogIn className="h-4 w-4 mr-2" />
              Anmelden
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link to="/login?mode=register" state={loginState}>
              <UserPlus className="h-4 w-4 mr-2" />
              Registrieren
            </Link>
          </Button>
        </div>
      }
    />
  );
}

import { useEffect, lazy, Suspense } from "react";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageTransition } from "@/components/shared/PageTransition";
import { AnimatePresence } from "framer-motion";
import { GuestAccessNotice } from "@/components/auth/GuestAccessNotice";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import * as Sentry from "@sentry/react";
import { clearPendingInviteCode, getPendingInviteCode } from "@/lib/pendingRoomInvite";
import { joinRoom } from "@/services/apiClient";

// Pages
const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const JoinRoomPage = lazy(() => import("@/pages/JoinRoomPage"));
const RoomsPage = lazy(() => import("@/pages/RoomsPage"));
const RoomDetailPage = lazy(() => import("@/pages/RoomDetailPage"));
const CreateEventPage = lazy(() => import("@/pages/CreateEventPage"));
const EventDetailPage = lazy(() => import("@/pages/EventDetailPage"));
const ActivitiesPage = lazy(() => import("@/pages/ActivitiesPage"));
const ActivityDetailPage = lazy(() => import("@/pages/ActivityDetailPage"));
const TeamPage = lazy(() => import("@/pages/TeamPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const BirthdaysPage = lazy(() => import("@/pages/BirthdaysPage"));
const MapPage = lazy(() => import("@/pages/MapPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const RequestResetPasswordPage = lazy(() => import("@/pages/RequestResetPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage"));
const DevSentryTest = lazy(() => import("@/pages/DevSentryTest"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Sentry captures unhandled exceptions automatically, but we can also log here if needed
      console.error("Global Query Error:", error);
      toast.error("Fehler beim Laden", {
        description: error.message || "Daten konnten nicht geladen werden.",
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error("Global Mutation Error:", error);
      toast.error("Fehler", {
        description: error.message || "Aktion konnte nicht durchgeführt werden.",
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

// Keep layout mounted across route changes
function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const completedByUserId = useOnboardingStore((state) => state.completedByUserId);
  const isOnboardingComplete = user ? !!completedByUserId[user.id] : false;

  useEffect(() => {
    const isOverview = location.pathname === "/";
    const isActivityDetail = /^\/activities\/[^/]+$/.test(location.pathname);

    if (isOverview || isActivityDetail) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      return;
    }
    if (location.pathname.startsWith("/onboarding")) {
      return;
    }
    if (isOnboardingComplete) {
      return;
    }

    navigate("/onboarding", { replace: true, state: { from: location } });
  }, [
    isLoading,
    isAuthenticated,
    user,
    isOnboardingComplete,
    location,
    navigate,
  ]);

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </AnimatePresence>
    </AppLayout>
  );
}

function AuthenticatedSection() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}

function RestrictedSection({ title, description }: { title: string; description: string }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 animate-pulse" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <GuestAccessNotice
        title={title}
        description={description}
        loginState={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
      <Route path="/join/:inviteCode" element={<PageTransition><JoinRoomPage /></PageTransition>} />
      <Route path="/forgot-password" element={<PageTransition><RequestResetPasswordPage /></PageTransition>} />
      <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
      <Route path="/verify-email" element={<PageTransition><VerifyEmailPage /></PageTransition>} />

      {/* App layout for all in-app pages */}
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="activities/:slug" element={<ActivityDetailPage />} />

        {/* Guest-visible but auth-gated sections show inline notice */}
        <Route
          element={
            <RestrictedSection
              title="Anmeldung erforderlich"
              description="Räume sind nur für angemeldete Nutzer sichtbar. Bitte melde dich an oder registriere dich, um deine Räume zu öffnen."
            />
          }
        >
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="rooms/:accessCode" element={<RoomDetailPage />} />
          <Route path="rooms/:accessCode/events/new" element={<CreateEventPage />} />
          <Route path="rooms/:accessCode/events/:eventCode" element={<EventDetailPage />} />
        </Route>

        <Route
          element={
            <RestrictedSection
              title="Anmeldung erforderlich"
              description="Die Team-Analyse steht nur angemeldeten Nutzern zur Verfügung."
            />
          }
        >
          <Route path="team" element={<TeamPage />} />
          <Route path="team/:roomId" element={<TeamPage />} />
        </Route>

        {/* Strictly protected routes */}
        <Route element={<AuthenticatedSection />}>
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="birthdays" element={<BirthdaysPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="map" element={<MapPage />} />
        <Route path="dev/sentry-test" element={<DevSentryTest />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

// Dark mode initializer
function useDarkMode() {
  useEffect(() => {
    const storedTheme = typeof window !== "undefined"
      ? window.localStorage.getItem("theme")
      : null;
    if (storedTheme === "light") {
      document.documentElement.classList.remove("dark");
      return;
    }
    document.documentElement.classList.add("dark");
  }, []);
}

const App = () => {
  useDarkMode();
  const { refresh, user, isAuthenticated, setRoomRole } = useAuthStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || !isAuthenticated) {
      return;
    }
    const pendingInviteCode = getPendingInviteCode();
    if (!pendingInviteCode) {
      return;
    }

    let isActive = true;

    const joinPendingRoom = async () => {
      const result = await joinRoom(pendingInviteCode);
      if (!isActive) {
        return;
      }
      if (result.data) {
        setRoomRole(result.data.id, "member");
        if (result.data.inviteCode) {
          setRoomRole(result.data.inviteCode, "member");
        }
        clearPendingInviteCode();
        return;
      }

      const errorCode = result.error?.code;
      if (errorCode === "400" || errorCode === "404") {
        clearPendingInviteCode();
      }
    };

    void joinPendingRoom();

    return () => {
      isActive = false;
    };
  }, [user, isAuthenticated, setRoomRole]);

  // Set Sentry user context when authenticated
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-destructive mb-4">Ein Fehler ist aufgetreten</h2>
            <p className="text-muted-foreground mb-4">
              Entschuldigung, es ist ein unerwarteter Fehler aufgetreten. Das Problem wurde automatisch gemeldet.
            </p>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto mb-4 max-h-32">
              {error?.toString()}
            </pre>
            <button
              onClick={resetError}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Suspense
              fallback={(
                <div className="min-h-screen gradient-bg flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/20 animate-pulse" />
                    <p className="text-muted-foreground">Seite wird geladen...</p>
                  </div>
                </div>
              )}
            >
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
};

export default App;

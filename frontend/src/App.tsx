import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageTransition } from "@/components/shared/PageTransition";
import { AnimatePresence } from "framer-motion";
import { GuestAccessNotice } from "@/components/auth/GuestAccessNotice";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import * as Sentry from "@sentry/react";

// Pages
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import JoinRoomPage from "@/pages/JoinRoomPage";
import RoomsPage from "@/pages/RoomsPage";
import RoomDetailPage from "@/pages/RoomDetailPage";
import CreateEventPage from "@/pages/CreateEventPage";
import EventDetailPage from "@/pages/EventDetailPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import ActivityDetailPage from "@/pages/ActivityDetailPage";
import TeamPage from "@/pages/TeamPage";
import ProfilePage from "@/pages/ProfilePage";
import MapPage from "@/pages/MapPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import RequestResetPasswordPage from "@/pages/RequestResetPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import DevSentryTest from "@/pages/DevSentryTest";
import OnboardingPage from "@/pages/OnboardingPage";

const queryClient = new QueryClient();

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
        <Outlet key={location.pathname} />
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
      <PageTransition>
        <GuestAccessNotice
          title={title}
          description={description}
          loginState={{ from: location }}
        />
      </PageTransition>
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
        <Route index element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="activities" element={<PageTransition><ActivitiesPage /></PageTransition>} />
        <Route path="activities/:slug" element={<PageTransition><ActivityDetailPage /></PageTransition>} />

        {/* Guest-visible but auth-gated sections show inline notice */}
        <Route
          element={
            <RestrictedSection
              title="Anmeldung erforderlich"
              description="Räume sind nur für angemeldete Nutzer sichtbar. Bitte melde dich an oder registriere dich, um deine Räume zu öffnen."
            />
          }
        >
          <Route path="rooms" element={<PageTransition><RoomsPage /></PageTransition>} />
          <Route path="rooms/:accessCode" element={<PageTransition><RoomDetailPage /></PageTransition>} />
          <Route path="rooms/:accessCode/events/new" element={<PageTransition><CreateEventPage /></PageTransition>} />
          <Route path="rooms/:accessCode/events/:eventCode" element={<PageTransition><EventDetailPage /></PageTransition>} />
        </Route>

        <Route
          element={
            <RestrictedSection
              title="Anmeldung erforderlich"
              description="Die Team-Analyse steht nur angemeldeten Nutzern zur Verfügung."
            />
          }
        >
          <Route path="team" element={<PageTransition><TeamPage /></PageTransition>} />
          <Route path="team/:roomId" element={<PageTransition><TeamPage /></PageTransition>} />
        </Route>

        {/* Strictly protected routes */}
        <Route element={<AuthenticatedSection />}>
          <Route path="onboarding" element={<PageTransition><OnboardingPage /></PageTransition>} />
          <Route path="profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        </Route>

        <Route path="map" element={<PageTransition><MapPage /></PageTransition>} />
        <Route path="dev/sentry-test" element={<PageTransition><DevSentryTest /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Route>
    </Routes>
  );
}

// Dark mode initializer
function useDarkMode() {
  useEffect(() => {
    // Always apply dark mode
    document.documentElement.classList.add("dark");
  }, []);
}

const App = () => {
  useDarkMode();
  const { refresh, user } = useAuthStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

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
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
};

export default App;

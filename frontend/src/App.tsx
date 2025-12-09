import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageTransition } from "@/components/shared/PageTransition";
import { AnimatePresence } from "framer-motion";

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

const queryClient = new QueryClient();

// Keep layout and auth mounted across route changes
function ProtectedAppLayout() {
  const location = useLocation();

  return (
    <RequireAuth>
      <AppLayout>
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </AppLayout>
    </RequireAuth>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
      <Route path="/join/:inviteCode" element={<PageTransition><JoinRoomPage /></PageTransition>} />

      {/* Protected routes share one persistent layout */}
      <Route element={<ProtectedAppLayout />}>
        <Route index element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="rooms" element={<PageTransition><RoomsPage /></PageTransition>} />
        <Route path="rooms/:roomId" element={<PageTransition><RoomDetailPage /></PageTransition>} />
        <Route path="rooms/:roomId/events/new" element={<PageTransition><CreateEventPage /></PageTransition>} />
        <Route path="rooms/:roomId/events/:eventId" element={<PageTransition><EventDetailPage /></PageTransition>} />
        <Route path="activities" element={<PageTransition><ActivitiesPage /></PageTransition>} />
        <Route path="activities/:activityId" element={<PageTransition><ActivityDetailPage /></PageTransition>} />
        <Route path="team" element={<PageTransition><TeamPage /></PageTransition>} />
        <Route path="profile" element={<PageTransition><ProfilePage /></PageTransition>} />
        <Route path="map" element={<PageTransition><MapPage /></PageTransition>} />
        <Route path="settings" element={<PageTransition><SettingsPage /></PageTransition>} />
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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

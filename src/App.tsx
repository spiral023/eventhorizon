import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import HomePage from "@/pages/HomePage";
import RoomsPage from "@/pages/RoomsPage";
import RoomDetailPage from "@/pages/RoomDetailPage";
import CreateEventPage from "@/pages/CreateEventPage";
import EventDetailPage from "@/pages/EventDetailPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import ProfilePage from "@/pages/ProfilePage";
import MapPage from "@/pages/MapPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main App Routes with Layout */}
          <Route
            path="/"
            element={
              <AppLayout>
                <HomePage />
              </AppLayout>
            }
          />
          <Route
            path="/rooms"
            element={
              <AppLayout>
                <RoomsPage />
              </AppLayout>
            }
          />
          <Route
            path="/rooms/:roomId"
            element={
              <AppLayout>
                <RoomDetailPage />
              </AppLayout>
            }
          />
          <Route
            path="/rooms/:roomId/events/new"
            element={
              <AppLayout>
                <CreateEventPage />
              </AppLayout>
            }
          />
          <Route
            path="/rooms/:roomId/events/:eventId"
            element={
              <AppLayout>
                <EventDetailPage />
              </AppLayout>
            }
          />
          <Route
            path="/activities"
            element={
              <AppLayout>
                <ActivitiesPage />
              </AppLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            }
          />
          <Route
            path="/map"
            element={
              <AppLayout>
                <MapPage />
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            }
          />
          {/* 404 - without layout */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

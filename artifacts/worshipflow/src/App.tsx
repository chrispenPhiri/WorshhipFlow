import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { useApplyControlAppearance } from "@/hooks/use-control-appearance";
import { AuthProvider, useAuth } from "@/lib/auth/context";

import BiblePage from "@/pages/bible";
import SongsPage from "@/pages/songs";
import CustomTextPage from "@/pages/custom";
import SchedulePage from "@/pages/schedule";
import NotesPage from "@/pages/notes";
import SettingsPage from "@/pages/settings";
import MediaPage from "@/pages/media";
import BroadcastPage from "@/pages/broadcast";
import ThemesPage from "@/pages/themes";
import InspirationPage from "@/pages/inspiration";
import TeachingsPage from "@/pages/teachings";
import GamesPage from "@/pages/games";
import HowToPage from "@/pages/how-to";
import AuthPage from "@/pages/auth";
import PrayerWallPage from "@/pages/prayer-wall";
import CountdownPage from "@/pages/countdown";
import HymnNumberPage from "@/pages/hymn-number";
import AIPage from "@/pages/ai";
import LibraryPage from "@/pages/library";
import QueuePage from "@/pages/queue";
import StudioPage from "@/pages/studio";

const queryClient = new QueryClient();

function ProtectedApp() {
  const { user, loading } = useAuth();

  // While we're hydrating the session, render a quiet placeholder so the
  // login screen doesn't flash for already-signed-in users.
  if (loading) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground dark"
        data-testid="auth-loading"
      >
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={BiblePage} />
        <Route path="/songs" component={SongsPage} />
        <Route path="/custom" component={CustomTextPage} />
        <Route path="/themes" component={ThemesPage} />
        <Route path="/media" component={MediaPage} />
        <Route path="/schedule" component={SchedulePage} />
        <Route path="/notes" component={NotesPage} />
        <Route path="/inspiration" component={InspirationPage} />
        <Route path="/teachings" component={TeachingsPage} />
        <Route path="/sunday-school" component={TeachingsPage} />
        <Route path="/prayer-wall" component={PrayerWallPage} />
        <Route path="/countdown" component={CountdownPage} />
        <Route path="/hymn-number" component={HymnNumberPage} />
        <Route path="/games" component={GamesPage} />
        <Route path="/ai" component={AIPage} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/queue" component={QueuePage} />
        <Route path="/studio" component={StudioPage} />
        <Route path="/how-to" component={HowToPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/*
        Broadcast bypasses the operator theme AND the auth gate — it's a
        same-origin output window opened by the operator after they've
        already signed in. Gating it would lock out the projector.
        useApplyControlAppearance() detects the route and clears any inline
        overrides so the projection screen always renders with the index.css
        defaults. The inline FOUC script in index.html also skips this path.
      */}
      <Route path="/broadcast" component={BroadcastPage} />
      <Route>
        <ProtectedApp />
      </Route>
    </Switch>
  );
}

function App() {
  // Apply the operator's saved control-screen appearance (color + font) before pages render.
  useApplyControlAppearance();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

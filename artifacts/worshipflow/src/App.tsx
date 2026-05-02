import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { useApplyControlAppearance } from "@/hooks/use-control-appearance";

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
import HowToPage from "@/pages/how-to";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/*
        Broadcast bypasses the operator theme — useApplyControlAppearance() detects the route and
        clears any inline overrides so the projection screen always renders with the index.css
        defaults. The inline FOUC script in index.html also skips this path.
      */}
      <Route path="/broadcast" component={BroadcastPage} />
      <Route>
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
            <Route path="/how-to" component={HowToPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  // Apply the operator's saved control-screen appearance (color + font) before pages render.
  useApplyControlAppearance();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import BiblePage from "@/pages/bible";
import SongsPage from "@/pages/songs";
import CustomTextPage from "@/pages/custom";
import SchedulePage from "@/pages/schedule";
import NotesPage from "@/pages/notes";
import SettingsPage from "@/pages/settings";
import MediaPage from "@/pages/media";
import BroadcastPage from "@/pages/broadcast";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/broadcast" component={BroadcastPage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={BiblePage} />
            <Route path="/songs" component={SongsPage} />
            <Route path="/custom" component={CustomTextPage} />
            <Route path="/media" component={MediaPage} />
            <Route path="/schedule" component={SchedulePage} />
            <Route path="/notes" component={NotesPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
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

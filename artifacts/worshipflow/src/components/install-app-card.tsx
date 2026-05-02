/**
 * Settings page card that lets the user install the app and shows offline
 * storage status.  Hidden on the broadcast route (no need there).
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, HardDrive, Wifi, WifiOff } from "lucide-react";
import { useInstallPrompt, isInstalled } from "@/lib/install-prompt";

function formatBytes(bytes: number | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function InstallAppCard() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [installed, setInstalled] = useState<boolean>(() => isInstalled());
  const [online, setOnline] = useState<boolean>(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [usage, setUsage] = useState<{ used?: number; quota?: number }>({});

  useEffect(() => {
    const check = () => setInstalled(isInstalled());
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("appinstalled", check);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    if ("storage" in navigator && "estimate" in navigator.storage) {
      navigator.storage.estimate().then(e => setUsage({ used: e.usage, quota: e.quota }));
    }
    return () => {
      window.removeEventListener("appinstalled", check);
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setInstalled(true);
  };

  return (
    <Card data-testid="card-install-app">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" /> Install &amp; Offline
        </CardTitle>
        <CardDescription>
          Install Phiri WorshipFlow as a desktop app and use it without an internet connection.
          Your songs, notes, schedule and screen settings are saved on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            {installed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Download className="h-4 w-4" />}
            <span data-testid="text-install-status">
              {installed ? "Installed as app" : "Not installed"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            {online ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-amber-500" />}
            <span data-testid="text-online-status">{online ? "Online" : "Offline (still works)"}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            <HardDrive className="h-4 w-4" />
            <span data-testid="text-storage-usage">
              {formatBytes(usage.used)} used{usage.quota ? ` / ${formatBytes(usage.quota)}` : ""}
            </span>
          </div>
        </div>

        {!installed && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              onClick={handleInstall}
              disabled={!canInstall}
              data-testid="button-install-app"
            >
              <Download className="h-4 w-4 mr-2" />
              {canInstall ? "Install App" : "Install (open in Chrome / Edge)"}
            </Button>
            <p className="text-xs text-muted-foreground">
              On Chrome or Edge: click the install icon in the address bar, or use the button.
              On Safari (Mac/iPad/iPhone): use Share → Add to Home Screen / Dock.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-3">
          <strong>What works offline:</strong> songs, sermon notes, schedule, themes,
          custom teachings, Bible Games, daily inspiration, screen control, and the
          broadcast window.<br />
          <strong>Needs internet:</strong> looking up new Bible verses, generating teachings with AI.
        </div>
      </CardContent>
    </Card>
  );
}

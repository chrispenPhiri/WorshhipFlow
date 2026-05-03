/**
 * Settings page card: install the app, see offline storage status, and manage
 * local backups (persistent storage permission, single-file export/import,
 * and a folder backup that mirrors the library to a real folder on disk).
 */

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Download,
  CheckCircle2,
  HardDrive,
  Wifi,
  WifiOff,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FolderOpen,
  Folder,
  FolderSync,
  FileDown,
  FileUp,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { useInstallPrompt, isInstalled } from "@/lib/install-prompt";
import {
  getPersistState,
  requestPersistent,
  PersistState,
} from "@/lib/backup/persistent";
import {
  downloadSnapshot,
  pickAndRestoreSnapshot,
} from "@/lib/backup/snapshot";
import { clearSession } from "@/lib/auth/store";
import {
  BackupFolderStatus,
  connectBackupFolder,
  disconnectBackupFolder,
  getBackupFolderStatus,
  isFolderApiSupported,
  reconnectBackupFolder,
  restoreFromFolder,
  saveBackupToFolder,
} from "@/lib/backup/folder";
import { toast } from "@/hooks/use-toast";

function formatBytes(bytes: number | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} h ago`;
  return new Date(iso).toLocaleString();
}

export function InstallAppCard() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [installed, setInstalled] = useState<boolean>(() => isInstalled());
  const [online, setOnline] = useState<boolean>(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [usage, setUsage] = useState<{ used?: number; quota?: number }>({});
  const [persist, setPersist] = useState<PersistState>("unsupported");
  const [folder, setFolder] = useState<BackupFolderStatus>({
    supported: false,
    connected: false,
    name: null,
    permission: null,
    lastSavedAt: null,
  });
  const [busy, setBusy] = useState<null | "export" | "import" | "connect" | "save" | "restore" | "reconnect">(null);
  const [confirmRestore, setConfirmRestore] = useState<null | "file" | "folder">(null);

  const refreshUsage = useCallback(async () => {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const e = await navigator.storage.estimate();
      setUsage({ used: e.usage, quota: e.quota });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setPersist(await getPersistState());
    setFolder(await getBackupFolderStatus());
    await refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    const check = () => setInstalled(isInstalled());
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("appinstalled", check);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    refreshAll();
    return () => {
      window.removeEventListener("appinstalled", check);
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
  }, [refreshAll]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setInstalled(true);
  };

  const handleRequestPersistent = async () => {
    const next = await requestPersistent();
    setPersist(next);
    toast({
      title: next === "persisted" ? "Storage is now protected" : "Browser kept storage as transient",
      description:
        next === "persisted"
          ? "This device won't auto-delete the app's data."
          : "Some browsers grant this only after the app has been used a while.",
    });
  };

  const withBusy = async <T,>(kind: typeof busy, fn: () => Promise<T>): Promise<T | null> => {
    setBusy(kind);
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      // Quietly swallow user-cancelled dialogs.
      if (!/cancelled/i.test(msg)) {
        toast({ title: "Couldn't finish", description: msg, variant: "destructive" });
      }
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleExport = () =>
    withBusy("export", async () => {
      const res = await downloadSnapshot();
      toast({ title: "Backup saved", description: `${res.filename} (${formatBytes(res.bytes)})` });
    });

  const handleImport = () => setConfirmRestore("file");
  const handleRestoreFromFolder = () => setConfirmRestore("folder");

  const doRestore = (source: "file" | "folder") =>
    withBusy(source === "file" ? "import" : "restore", async () => {
      const res =
        source === "file" ? await pickAndRestoreSnapshot() : await restoreFromFolder();
      // The restored snapshot may contain a different set of user accounts.
      // The currently signed-in session could now refer to a user that no
      // longer exists, so clear it and force a hard reload — this also
      // re-runs every IDB-backed React Query and the auth gate, guaranteeing
      // the UI reflects the new library cleanly.
      clearSession();
      toast({
        title: "Library restored",
        description: `${res.counts.songs} songs, ${res.counts.notes} notes, ${res.counts.schedules} schedules, ${res.counts.users} accounts. Reloading…`,
      });
      setTimeout(() => window.location.reload(), 1200);
    });

  const handleConnectFolder = () =>
    withBusy("connect", async () => {
      const next = await connectBackupFolder();
      setFolder(next);
      toast({ title: "Backup folder connected", description: next.name ?? "" });
    });

  const handleDisconnectFolder = () =>
    withBusy("connect", async () => {
      await disconnectBackupFolder();
      setFolder(await getBackupFolderStatus());
      toast({ title: "Backup folder disconnected" });
    });

  const handleSaveToFolder = () =>
    withBusy("save", async () => {
      const res = await saveBackupToFolder();
      setFolder(await getBackupFolderStatus());
      toast({ title: "Saved to folder", description: `${res.rolling} + ${res.archived}` });
    });

  const handleReconnectFolder = () =>
    withBusy("reconnect", async () => {
      const next = await reconnectBackupFolder();
      setFolder(next);
      toast({ title: "Folder reconnected" });
    });

  const persistIcon =
    persist === "persisted" ? (
      <ShieldCheck className="h-4 w-4 text-emerald-500" />
    ) : persist === "transient" ? (
      <ShieldAlert className="h-4 w-4 text-amber-500" />
    ) : (
      <Shield className="h-4 w-4" />
    );

  return (
    <Card data-testid="card-install-app">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" /> Install &amp; Local Storage
        </CardTitle>
        <CardDescription>
          Install Phiri WorshipFlow as a desktop app, protect your data from
          being deleted, and back up your full library to a real folder on this
          PC.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Status row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
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
              {formatBytes(usage.used)}{usage.quota ? ` / ${formatBytes(usage.quota)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            {persistIcon}
            <span data-testid="text-persist-status">
              {persist === "persisted"
                ? "Storage protected"
                : persist === "transient"
                  ? "Storage transient"
                  : "Storage info unavailable"}
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

        <Separator />

        {/* Persistent storage */}
        <section className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" /> Protect this device's data
          </h3>
          <p className="text-sm text-muted-foreground">
            Browsers may quietly delete a website's offline data when disk space
            runs low. Asking for "persistent storage" tells the browser to keep
            your songs, notes and schedules safe. Installed apps are usually
            granted automatically.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRequestPersistent}
              disabled={persist === "persisted" || persist === "unsupported"}
              data-testid="button-request-persistent"
            >
              {persist === "persisted" ? (
                <><ShieldCheck className="h-4 w-4 mr-2" /> Already protected</>
              ) : (
                <><Shield className="h-4 w-4 mr-2" /> Protect storage</>
              )}
            </Button>
            {persist === "unsupported" && (
              <span className="text-xs text-muted-foreground">
                Your browser doesn't expose this control.
              </span>
            )}
          </div>
        </section>

        <Separator />

        {/* Single-file export / import */}
        <section className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <FileDown className="h-4 w-4" /> Save / restore the whole library
          </h3>
          <p className="text-sm text-muted-foreground">
            Export everything — songs, notes, schedules, screen settings and
            local accounts — as a single file you can keep anywhere on disk,
            put on a USB stick, or move to another PC.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExport}
              disabled={busy === "export"}
              data-testid="button-export-library"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {busy === "export" ? "Saving…" : "Export to file"}
            </Button>
            <Button
              variant="outline"
              onClick={handleImport}
              disabled={busy === "import"}
              data-testid="button-import-library"
            >
              <FileUp className="h-4 w-4 mr-2" />
              {busy === "import" ? "Restoring…" : "Restore from file"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Restoring replaces everything currently on this device.
          </p>
        </section>

        <Separator />

        {/* Folder backup */}
        <section className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <FolderSync className="h-4 w-4" /> Backup folder on this PC
          </h3>
          <p className="text-sm text-muted-foreground">
            Pick a folder once (e.g. your Documents folder or a OneDrive /
            Dropbox folder). Then any time you click "Save backup", the app
            writes the latest library into that folder, keeping the last 10
            point-in-time copies under <code>history/</code>.
          </p>

          {!folder.supported ? (
            <p className="text-xs text-muted-foreground">
              Your browser doesn't support direct folder access. Use the file
              export above instead — it works everywhere.
            </p>
          ) : !folder.connected ? (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleConnectFolder}
                disabled={busy === "connect"}
                data-testid="button-connect-folder"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {busy === "connect" ? "Choosing…" : "Choose backup folder"}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-emerald-500" />
                  <span data-testid="text-backup-folder-name">{folder.name}</span>
                  {folder.permission !== "granted" && (
                    <span className="text-xs text-amber-500">(needs reconnect)</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground" data-testid="text-backup-last-saved">
                  Last saved: {formatRelative(folder.lastSavedAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {folder.permission !== "granted" ? (
                  <Button
                    onClick={handleReconnectFolder}
                    disabled={busy === "reconnect"}
                    data-testid="button-reconnect-folder"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {busy === "reconnect" ? "Reconnecting…" : "Reconnect folder"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSaveToFolder}
                    disabled={busy === "save"}
                    data-testid="button-save-to-folder"
                  >
                    <FolderSync className="h-4 w-4 mr-2" />
                    {busy === "save" ? "Saving…" : "Save backup now"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleRestoreFromFolder}
                  disabled={busy === "restore" || folder.permission !== "granted"}
                  data-testid="button-restore-from-folder"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  {busy === "restore" ? "Restoring…" : "Restore from folder"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDisconnectFolder}
                  disabled={busy === "connect"}
                  data-testid="button-disconnect-folder"
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </>
          )}
        </section>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <strong>What works offline:</strong> songs, sermon notes, schedule, themes,
          custom teachings, Bible Games, daily inspiration, screen control, and the
          broadcast window.<br />
          <strong>Needs internet:</strong> looking up new Bible verses, generating teachings with AI.
        </div>
      </CardContent>

      <AlertDialog open={confirmRestore !== null} onOpenChange={(o) => !o && setConfirmRestore(null)}>
        <AlertDialogContent data-testid="dialog-confirm-restore">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your current library?</AlertDialogTitle>
            <AlertDialogDescription>
              Restoring will overwrite everything on this device — songs, notes,
              schedules, screen settings, and local accounts — with the contents
              of the backup. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-restore"
              onClick={() => {
                const src = confirmRestore;
                setConfirmRestore(null);
                if (src) doRestore(src);
              }}
            >
              Yes, replace everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

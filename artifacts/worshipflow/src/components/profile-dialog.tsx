import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, Camera, Loader2, Check, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: Props) {
  const { user, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);
    if (!displayName.trim()) { setError("Display name cannot be empty."); return; }
    if (newPassword && newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
    if (newPassword && newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        ...(newPassword ? { newPassword, currentPassword } : {}),
        avatar: avatarPreview,
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Change profile picture"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-9 h-9" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                <Camera className="w-3 h-3" />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <p className="text-xs text-muted-foreground">Click to change photo · max 2 MB</p>
          </div>

          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="profile-display-name">Display name</Label>
            <Input
              id="profile-display-name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
            />
          </div>

          {/* Username (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Username</Label>
            <Input value={`@${user.username}`} readOnly className="opacity-60 cursor-default" />
          </div>

          <Separator />

          {/* Change password */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Change password <span className="text-muted-foreground font-normal">(optional)</span></p>
            <div className="space-y-1.5">
              <Label htmlFor="profile-current-pw">Current password</Label>
              <div className="relative">
                <Input
                  id="profile-current-pw"
                  type={showPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Required to change password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-new-pw">New password</Label>
              <Input
                id="profile-new-pw"
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-confirm-pw">Confirm new password</Label>
              <Input
                id="profile-confirm-pw"
                type={showPw ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5 min-w-[90px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : null}
              {success ? "Saved!" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

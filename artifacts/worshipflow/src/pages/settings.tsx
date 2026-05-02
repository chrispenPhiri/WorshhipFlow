import { useState, useEffect } from "react";
import { 
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon } from "lucide-react";
import { BIBLE_TRANSLATIONS, FONTS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });

  const { mutate: updateSettings, isPending } = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved", description: "Your app settings have been updated." });
      }
    }
  });

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings({ data: formData });
  };

  if (isLoading) {
    return <div className="p-8 animate-pulse space-y-4 max-w-2xl"><div className="h-8 bg-muted w-1/3 rounded"/><div className="h-64 bg-muted rounded"/></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure global app behavior and defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Church Name</label>
            <Input 
              value={formData.churchName || ""} 
              onChange={(e) => setFormData({...formData, churchName: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Bible Version</label>
              <Select 
                value={formData.defaultBibleVersion || "KJV"} 
                onValueChange={(v) => setFormData({...formData, defaultBibleVersion: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BIBLE_TRANSLATIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Font</label>
              <Select 
                value={formData.defaultFont || "Inter"} 
                onValueChange={(v) => setFormData({...formData, defaultFont: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Ticker Bar</label>
                <p className="text-xs text-muted-foreground">Show scrolling text at the bottom of the screen</p>
              </div>
              <Switch 
                checked={formData.tickerEnabled || false} 
                onCheckedChange={(c) => setFormData({...formData, tickerEnabled: c})} 
              />
            </div>
            
            {formData.tickerEnabled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Ticker Text</label>
                <Input 
                  value={formData.tickerText || ""} 
                  onChange={(e) => setFormData({...formData, tickerText: e.target.value})} 
                  placeholder="Welcome to our service!"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
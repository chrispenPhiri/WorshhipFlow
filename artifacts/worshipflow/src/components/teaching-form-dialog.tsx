import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  type Teaching, type TeachingCategory, TEACHING_CATEGORIES,
} from "@/lib/teachings";
import { emptyTeachingDraft } from "@/lib/custom-teachings";

interface TeachingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial draft to edit. If undefined, a fresh empty draft is used. */
  initial?: Teaching;
  onSave: (data: Omit<Teaching, "id">) => void;
  /** Optional AI generation handler. If provided, a "Generate with AI" button is shown. */
  onGenerate?: (topic: string, category: TeachingCategory) => Promise<Omit<Teaching, "id">>;
  title?: string;
}

export function TeachingFormDialog({
  open, onOpenChange, initial, onSave, onGenerate,
  title = "New Teaching",
}: TeachingFormDialogProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Omit<Teaching, "id">>(() =>
    initial ?? emptyTeachingDraft()
  );
  const [aiTopic, setAiTopic] = useState("");
  const [aiCategory, setAiCategory] = useState<TeachingCategory>("Adults");
  const [generating, setGenerating] = useState(false);

  // Reset whenever the dialog reopens (so editing one lesson then opening "new" gives a blank).
  useEffect(() => {
    if (open) {
      setDraft(initial ?? emptyTeachingDraft());
      setAiTopic("");
    }
  }, [open, initial]);

  const updatePoint = (i: number, patch: Partial<Teaching["points"][number]>) => {
    setDraft(d => ({
      ...d,
      points: d.points.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));
  };

  const addPoint = () => {
    setDraft(d => ({ ...d, points: [...d.points, { heading: "", body: "" }] }));
  };

  const removePoint = (i: number) => {
    setDraft(d => ({
      ...d,
      points: d.points.length > 1 ? d.points.filter((_, idx) => idx !== i) : d.points,
    }));
  };

  const updateQuestion = (i: number, value: string) => {
    setDraft(d => ({
      ...d,
      discussionQuestions: d.discussionQuestions.map((q, idx) => (idx === i ? value : q)),
    }));
  };

  const addQuestion = () => {
    setDraft(d => ({ ...d, discussionQuestions: [...d.discussionQuestions, ""] }));
  };

  const removeQuestion = (i: number) => {
    setDraft(d => ({
      ...d,
      discussionQuestions: d.discussionQuestions.length > 1
        ? d.discussionQuestions.filter((_, idx) => idx !== i)
        : d.discussionQuestions,
    }));
  };

  const handleGenerate = async () => {
    if (!onGenerate) return;
    if (!aiTopic.trim()) {
      toast({ title: "Topic required", description: "Tell the AI what to write about (e.g. 'Patience' or 'Naomi')." });
      return;
    }
    setGenerating(true);
    try {
      const result = await onGenerate(aiTopic.trim(), aiCategory);
      setDraft(result);
      toast({ title: "Teaching drafted", description: "Review and edit before saving." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Try again or write the lesson manually.";
      toast({ title: "Generation failed", description: message });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!draft.title.trim()) {
      toast({ title: "Title required" });
      return;
    }
    if (!draft.keyVerse.reference.trim() || !draft.keyVerse.text.trim()) {
      toast({ title: "Key verse required", description: "Add a reference and the verse text." });
      return;
    }
    // Strip empty trailing questions/points to keep data clean.
    const cleaned: Omit<Teaching, "id"> = {
      ...draft,
      title: draft.title.trim(),
      theme: draft.theme.trim() || "General",
      summary: draft.summary.trim(),
      activity: draft.activity.trim(),
      prayer: draft.prayer.trim(),
      keyVerse: {
        reference: draft.keyVerse.reference.trim(),
        text: draft.keyVerse.text.trim(),
      },
      points: draft.points
        .filter(p => p.heading.trim() || p.body.trim())
        .map(p => ({ heading: p.heading.trim(), body: p.body.trim() })),
      discussionQuestions: draft.discussionQuestions
        .map(q => q.trim())
        .filter(Boolean),
      memoryVerse: draft.memoryVerse?.trim() || undefined,
    };
    if (cleaned.points.length === 0) {
      toast({ title: "Add at least one teaching point" });
      return;
    }
    onSave(cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-teaching-form">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the lesson manually, or have AI draft it for you and then refine.
          </DialogDescription>
        </DialogHeader>

        {/* AI generation block */}
        {onGenerate && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
              <h3 className="font-semibold">Generate with AI</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Give a topic or focus and pick a category. AI fills the form below — you can still edit anything before saving.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="Topic or focus (e.g. Patience, Naomi, Forgiveness)"
                data-testid="input-ai-topic"
                disabled={generating}
                className="flex-1"
              />
              <Select
                value={aiCategory}
                onValueChange={v => setAiCategory(v as TeachingCategory)}
                disabled={generating}
              >
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-ai-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEACHING_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !aiTopic.trim()}
                className="gap-2"
                data-testid="button-generate-ai"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? "Drafting…" : "Generate"}
              </Button>
            </div>
          </div>
        )}

        {/* Manual fields */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
            <div>
              <Label htmlFor="t-title">Title</Label>
              <Input
                id="t-title"
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="Lesson title"
                data-testid="input-title"
              />
            </div>
            <div>
              <Label htmlFor="t-cat">Category</Label>
              <Select
                value={draft.category}
                onValueChange={v => setDraft(d => ({ ...d, category: v as TeachingCategory }))}
              >
                <SelectTrigger id="t-cat" data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEACHING_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="t-theme">Theme</Label>
              <Input
                id="t-theme"
                value={draft.theme}
                onChange={e => setDraft(d => ({ ...d, theme: e.target.value }))}
                placeholder="e.g. Faith"
                data-testid="input-theme"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="t-summary">Summary</Label>
            <Textarea
              id="t-summary"
              value={draft.summary}
              onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))}
              placeholder="One- or two-sentence summary of the lesson"
              rows={2}
              data-testid="input-summary"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <div>
              <Label htmlFor="t-ref">Key Verse Reference</Label>
              <Input
                id="t-ref"
                value={draft.keyVerse.reference}
                onChange={e => setDraft(d => ({ ...d, keyVerse: { ...d.keyVerse, reference: e.target.value } }))}
                placeholder="John 3:16"
                data-testid="input-key-verse-ref"
              />
            </div>
            <div>
              <Label htmlFor="t-text">Key Verse Text</Label>
              <Textarea
                id="t-text"
                value={draft.keyVerse.text}
                onChange={e => setDraft(d => ({ ...d, keyVerse: { ...d.keyVerse, text: e.target.value } }))}
                placeholder="For God so loved the world…"
                rows={2}
                data-testid="input-key-verse-text"
              />
            </div>
          </div>

          {/* Teaching points */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Teaching Points</Label>
              <Button type="button" size="sm" variant="outline" onClick={addPoint} className="gap-1.5" data-testid="button-add-point">
                <Plus className="w-3.5 h-3.5" /> Add point
              </Button>
            </div>
            <div className="space-y-2">
              {draft.points.map((p, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2" data-testid={`form-point-${i}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Point {i + 1}</span>
                    <Input
                      value={p.heading}
                      onChange={e => updatePoint(i, { heading: e.target.value })}
                      placeholder="Point heading"
                      className="flex-1"
                      data-testid={`input-point-heading-${i}`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removePoint(i)}
                      disabled={draft.points.length === 1}
                      aria-label={`Remove point ${i + 1}`}
                      data-testid={`button-remove-point-${i}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Textarea
                    value={p.body}
                    onChange={e => updatePoint(i, { body: e.target.value })}
                    placeholder="What this point teaches"
                    rows={2}
                    data-testid={`input-point-body-${i}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Discussion questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Discussion Questions</Label>
              <Button type="button" size="sm" variant="outline" onClick={addQuestion} className="gap-1.5" data-testid="button-add-question">
                <Plus className="w-3.5 h-3.5" /> Add question
              </Button>
            </div>
            <div className="space-y-2">
              {draft.discussionQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-muted-foreground mt-2.5 w-7 text-right">Q{i + 1}.</span>
                  <Input
                    value={q}
                    onChange={e => updateQuestion(i, e.target.value)}
                    placeholder="Discussion question"
                    className="flex-1"
                    data-testid={`input-question-${i}`}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeQuestion(i)}
                    disabled={draft.discussionQuestions.length === 1}
                    aria-label={`Remove question ${i + 1}`}
                    data-testid={`button-remove-question-${i}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="t-activity">Activity</Label>
              <Textarea
                id="t-activity"
                value={draft.activity}
                onChange={e => setDraft(d => ({ ...d, activity: e.target.value }))}
                placeholder="Practical activity for the group"
                rows={3}
                data-testid="input-activity"
              />
            </div>
            <div>
              <Label htmlFor="t-prayer">Closing Prayer</Label>
              <Textarea
                id="t-prayer"
                value={draft.prayer}
                onChange={e => setDraft(d => ({ ...d, prayer: e.target.value }))}
                placeholder="A short closing prayer"
                rows={3}
                data-testid="input-prayer"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="t-mem">Memory Verse (optional)</Label>
            <Input
              id="t-mem"
              value={draft.memoryVerse ?? ""}
              onChange={e => setDraft(d => ({ ...d, memoryVerse: e.target.value }))}
              placeholder="e.g. Psalm 23:1"
              data-testid="input-memory-verse"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-teaching">
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2" data-testid="button-save-teaching">
            <Save className="w-4 h-4" /> Save Teaching
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

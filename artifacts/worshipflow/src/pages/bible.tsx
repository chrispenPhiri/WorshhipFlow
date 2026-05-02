import { useState } from "react";
import { BIBLE_BOOKS, BIBLE_TRANSLATIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Book } from "lucide-react";

export default function BiblePage() {
  const [translation, setTranslation] = useState("KJV");
  const [book, setBook] = useState("John");
  const [chapter, setChapter] = useState("3");
  const [fromVerse, setFromVerse] = useState("16");
  const [toVerse, setToVerse] = useState("17");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, reference: string } | null>(null);

  const queryClient = useQueryClient();
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() })
    }
  });

  const handleFetch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://bible-api.com/${book}+${chapter}:${fromVerse}-${toVerse}?translation=${translation.toLowerCase()}`);
      const data = await res.json();
      if (data.text) {
        setResult({
          text: data.text.trim(),
          reference: data.reference
        });
      }
    } catch (e) {
      console.error("Failed to fetch bible verse", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToScreen = () => {
    if (!result) return;
    updateScreen({
      data: {
        contentType: "verse",
        title: result.reference,
        content: result.text,
        isBlack: false,
        isClear: false,
        textStyle: {
          fontFamily: "Georgia",
          fontSize: 64,
          textColor: "#ffffff",
          alignment: "center",
          animation: "fade_in"
        },
        background: { type: "color", value: "#000000" }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Book className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Bible Passage</h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-5 gap-4 items-end">
            <div className="col-span-1 space-y-2">
              <label className="text-sm font-medium">Translation</label>
              <Select value={translation} onValueChange={setTranslation}>
                <SelectTrigger>
                  <SelectValue placeholder="Translation" />
                </SelectTrigger>
                <SelectContent>
                  {BIBLE_TRANSLATIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Book</label>
              <Select value={book} onValueChange={setBook}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Book" />
                </SelectTrigger>
                <SelectContent>
                  {BIBLE_BOOKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 space-y-2">
              <label className="text-sm font-medium">Chapter</label>
              <Input value={chapter} onChange={(e) => setChapter(e.target.value)} type="number" />
            </div>
            <div className="col-span-1 space-y-2 flex items-center gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium">From</label>
                <Input value={fromVerse} onChange={(e) => setFromVerse(e.target.value)} type="number" />
              </div>
              <span className="mt-6 text-muted-foreground">-</span>
              <div className="flex-1">
                <label className="text-sm font-medium">To</label>
                <Input value={toVerse} onChange={(e) => setToVerse(e.target.value)} type="number" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={handleFetch} disabled={loading}>
              {loading ? "Fetching..." : "Get Verse"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-card border-accent/20 border-2">
          <CardHeader>
            <CardTitle className="text-accent">{result.reference}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-background rounded border border-border text-lg font-serif italic text-center">
              "{result.text}"
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSendToScreen} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                Send to Screen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

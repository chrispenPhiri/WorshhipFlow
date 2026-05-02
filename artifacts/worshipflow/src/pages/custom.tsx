import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Type, Cast, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FONTS } from "@/lib/constants";
import { Slider } from "@/components/ui/slider";

export default function CustomTextPage() {
  const [content, setContent] = useState("Welcome to Worship");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState([64]);
  const [alignment, setAlignment] = useState("center");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [textColor, setTextColor] = useState("#ffffff");
  
  const queryClient = useQueryClient();
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() })
    }
  });

  const handleSendToScreen = () => {
    updateScreen({
      data: {
        contentType: "custom_text",
        title: "Custom Text",
        content,
        isBlack: false,
        isClear: false,
        textStyle: {
          fontFamily,
          fontSize: fontSize[0],
          textColor,
          alignment: alignment as any,
          animation: "fade_in",
          bold,
          italic
        },
        background: { type: "color", value: "#000000" }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Type className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Custom Text</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your custom text here..."
              className="min-h-[300px] text-lg resize-none"
              style={{
                fontFamily,
                fontWeight: bold ? 'bold' : 'normal',
                fontStyle: italic ? 'italic' : 'normal',
                textAlign: alignment as any
              }}
            />
            <div className="flex justify-end">
              <Button size="lg" onClick={handleSendToScreen} className="w-full sm:w-auto">
                <Cast className="w-4 h-4 mr-2" /> Send to Screen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Font Family</label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Font Size</label>
                <span className="text-sm text-muted-foreground">{fontSize[0]}px</span>
              </div>
              <Slider value={fontSize} onValueChange={setFontSize} min={24} max={144} step={2} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Style & Alignment</label>
              <div className="flex gap-2 flex-wrap">
                <Toggle pressed={bold} onPressedChange={setBold} aria-label="Toggle bold">
                  <Bold className="w-4 h-4" />
                </Toggle>
                <Toggle pressed={italic} onPressedChange={setItalic} aria-label="Toggle italic">
                  <Italic className="w-4 h-4" />
                </Toggle>
                <div className="h-10 w-px bg-border mx-1" />
                <Toggle pressed={alignment === "left"} onPressedChange={() => setAlignment("left")} aria-label="Align left">
                  <AlignLeft className="w-4 h-4" />
                </Toggle>
                <Toggle pressed={alignment === "center"} onPressedChange={() => setAlignment("center")} aria-label="Align center">
                  <AlignCenter className="w-4 h-4" />
                </Toggle>
                <Toggle pressed={alignment === "right"} onPressedChange={() => setAlignment("right")} aria-label="Align right">
                  <AlignRight className="w-4 h-4" />
                </Toggle>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Text Color</label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1" />
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

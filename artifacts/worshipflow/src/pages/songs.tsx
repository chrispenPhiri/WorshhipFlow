import { useState } from "react";
import { 
  useListSongs, 
  useGetSongStats, 
  useCreateSong, 
  useUpdateScreenState, 
  getListSongsQueryKey, 
  getGetScreenStateQueryKey,
  getGetSongStatsQueryKey,
  CreateSongBodyCategory
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Music, Plus, Search, Cast } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function SongsPage() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  
  const queryParams = { 
    ...(category !== "all" && { category }), 
    ...(search && { search }) 
  };
  
  const { data: songs = [], isLoading } = useListSongs(queryParams, { 
    query: { queryKey: getListSongsQueryKey(queryParams) } 
  });

  const { data: stats } = useGetSongStats({
    query: { queryKey: getGetSongStatsQueryKey() }
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() })
    }
  });

  const handleSendToScreen = (song: any) => {
    updateScreen({
      data: {
        contentType: "song",
        title: song.title,
        content: song.lyrics,
        isBlack: false,
        isClear: false,
        textStyle: {
          fontFamily: "Inter",
          fontSize: 48,
          textColor: "#ffffff",
          alignment: "center",
          animation: "fade_in"
        },
        background: { type: "color", value: "#000000" }
      }
    });
  };

  const categories = ["all", "hymn", "worship", "gospel", "contemporary", "christmas", "shona", "ndebele", "other"];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            <Music className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Songs Library</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Song</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Song</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center text-muted-foreground">
              Form implementation skipped for brevity in this task iteration.
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search songs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="mb-4 flex flex-wrap h-auto">
          {categories.map(c => (
            <TabsTrigger key={c} value={c} className="capitalize">
              {c} {stats?.byCategory && stats.byCategory[c] !== undefined && `(${stats.byCategory[c]})`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {songs.map((song: any) => (
            <Card key={song.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setExpandedId(song.id === expandedId ? null : song.id)}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{song.title}</CardTitle>
                  <Badge variant="secondary" className="capitalize">{song.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{song.author}</p>
              </CardHeader>
              {expandedId === song.id && (
                <CardContent className="pt-2">
                  <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md mb-4 max-h-48 overflow-y-auto">
                    {song.lyrics}
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendToScreen(song);
                    }}
                  >
                    <Cast className="w-4 h-4 mr-2" /> Send to Screen
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
          {songs.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              No songs found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

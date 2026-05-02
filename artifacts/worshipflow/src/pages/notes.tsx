import { useState } from "react";
import { 
  useListNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  getListNotesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading } = useListNotes({
    query: { queryKey: getListNotesQueryKey() }
  });

  const { mutate: deleteNote } = useDeleteNote({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() })
    }
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Sermon Notes</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Note</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Note</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center text-muted-foreground">
              Form implementation skipped for brevity.
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note: any) => (
            <Card key={note.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{note.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteNote({ id: note.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {note.speaker} • {format(new Date(note.date), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm line-clamp-4 text-muted-foreground mb-4">
                  {note.content}
                </div>
                {note.scriptures && note.scriptures.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.scriptures.map((s: string, i: number) => (
                      <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {notes.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              No notes found. Create one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
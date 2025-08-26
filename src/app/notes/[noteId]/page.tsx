// Server component wrapper for the client editor
import NoteEditorClient from "@/components/NoteEditorClient";

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  return <NoteEditorClient noteId={noteId} />;
}

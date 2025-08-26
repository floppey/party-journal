// Server component wrapper for the client editor
import NoteEditorClient from "@/components/NoteEditorClient";

// Generate static params for build - provide dummy entry for static export
export async function generateStaticParams() {
  return [{ noteId: "new" }];
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  return <NoteEditorClient noteId={noteId} />;
}

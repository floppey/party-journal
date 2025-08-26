// Static export compatible note page
import NoteEditorClient from "@/components/NoteEditorClient";

// For static export, we generate a limited set of static pages
// All dynamic note access happens client-side through the notes list
export async function generateStaticParams() {
  return [
    { noteId: "new" }, // For creating new notes
  ];
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;

  return <NoteEditorClient noteId={noteId} />;
}

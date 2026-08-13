import { NextResponse } from "next/server";
import { moveDriveFile } from "@/lib/drive";

export async function POST(request: Request) {
  try {
    const { fileId, remboursed } = await request.json();
    if (!fileId || typeof fileId !== "string") {
      return NextResponse.json({ error: "fileId manquant" }, { status: 400 });
    }

    const targetFolderId = remboursed
      ? process.env.GOOGLE_DRIVE_FOLDER_REMBOURSE_ID
      : process.env.GOOGLE_DRIVE_FOLDER_NON_REMBOURSE_ID;

    if (!targetFolderId) {
      return NextResponse.json({ error: "Dossier de destination non configuré" }, { status: 500 });
    }

    await moveDriveFile(fileId, targetFolderId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors du déplacement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

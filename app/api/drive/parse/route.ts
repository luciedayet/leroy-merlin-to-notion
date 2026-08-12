import { NextResponse } from "next/server";
import { downloadDriveFile } from "@/lib/drive";
import { parseFacture } from "@/lib/parser";

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json();
    if (!fileId || typeof fileId !== "string") {
      return NextResponse.json({ error: "fileId manquant" }, { status: 400 });
    }

    const buffer = await downloadDriveFile(fileId);
    const facture = await parseFacture(buffer);

    return NextResponse.json(facture);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors du parsing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

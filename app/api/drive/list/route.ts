import { NextResponse } from "next/server";
import { listDriveFiles } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const files = await listDriveFiles();
    return NextResponse.json({ files });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors de la récupération des fichiers Drive";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

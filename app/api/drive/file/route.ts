import { NextRequest, NextResponse } from "next/server";
import { downloadDriveFile } from "@/lib/drive";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ error: "fileId manquant" }, { status: 400 });
  }

  try {
    const buffer = await downloadDriveFile(fileId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors du téléchargement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

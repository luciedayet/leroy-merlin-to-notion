import { NextResponse } from "next/server";
import { parseFacture } from "@/lib/parser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Le fichier doit être un PDF" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const facture = await parseFacture(buffer);

    return NextResponse.json(facture);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors du parsing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { importArticles } from "@/lib/notion";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articles, facture, payeur, remboursed } = body;

    if (!articles?.length) {
      return NextResponse.json({ error: "Aucun article à importer" }, { status: 400 });
    }

    const count = await importArticles(articles, facture, {
      payeur,
      remboursed,
    });

    return NextResponse.json({ count });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors de l'import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

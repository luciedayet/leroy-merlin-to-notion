import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "lm_access";

export async function POST(request: NextRequest) {
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return NextResponse.json({ error: "Authentification non configurée" }, { status: 500 });
  }

  const { code } = await request.json();
  if (code !== accessCode) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, accessCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

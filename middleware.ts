import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "lm_access";

export function middleware(request: NextRequest) {
  const accessCode = process.env.ACCESS_CODE;

  // Si aucun code n'est configuré, l'authentification est désactivée.
  if (!accessCode) {
    return NextResponse.next();
  }

  const authorized = request.cookies.get(COOKIE_NAME)?.value === accessCode;
  if (authorized) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|favicon.ico|manifest.json|icon-192.png|icon-512.png|apple-touch-icon.png|favicon-32.png|sw.js).*)",
  ],
};

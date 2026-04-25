import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const proxyConfig = {
  // Allowlist explícito: solo rutas de la app. Los assets de _next/ nunca entran aquí.
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/tutor/:path*",
    "/menor/:path*",
    "/pacto/:path*",
    "/confianza/:path*",
    "/demo/:path*",
  ],
};

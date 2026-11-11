import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const allowed = (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();
    if (!error && data.user?.email?.toLowerCase() === allowed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login?error=1", request.url));
}

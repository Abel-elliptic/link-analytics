import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** PKCE 方式（メールテンプレートが既定のままの場合）。ボタンを押したのと同じブラウザで開いた場合のみ成功する。 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    console.error("auth callback without code:", request.nextUrl.searchParams.get("error_description"));
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("exchangeCodeForSession failed:", error.code, error.message);
    return NextResponse.redirect(new URL("/login?error=browser", request.url));
  }
  if (!isAllowedEmail(data.user?.email)) {
    console.error("login rejected: email not allowed");
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=denied", request.url));
  }
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

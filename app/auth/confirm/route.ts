import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * メールのリンク（token_hash 方式）でログインを確定する。
 * PKCE と違い、ボタンを押したブラウザと別の端末・アプリでリンクを開いても成功する。
 * Supabase の Magic Link メールテンプレートで
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * を指すようにしておく必要がある。
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = (request.nextUrl.searchParams.get("type") ?? "email") as EmailOtpType;
  if (!tokenHash) return NextResponse.redirect(new URL("/login?error=link", request.url));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    console.error("verifyOtp failed:", error.code, error.message);
    return NextResponse.redirect(new URL("/login?error=expired", request.url));
  }
  if (!isAllowedEmail(data.user?.email)) {
    console.error("login rejected: email not allowed");
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=denied", request.url));
  }
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

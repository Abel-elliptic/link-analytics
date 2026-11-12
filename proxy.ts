import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRole } from "@/lib/members";

/** /dashboard 配下だけでセッションを更新し、未ログインまたはメンバー以外なら /login へ。短縮URLのリダイレクトには関与しない。 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const role = data.user ? await getRole(data.user) : null;
  if (!role) {
    if (data.user) await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = data.user ? "?error=denied" : "";
    const redirect = NextResponse.redirect(url);
    // signOut で消した Cookie をリダイレクトにも反映する
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = { matcher: ["/dashboard/:path*"] };

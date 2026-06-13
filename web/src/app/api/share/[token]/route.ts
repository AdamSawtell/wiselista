import { NextResponse } from "next/server";
import { getSharePageData } from "@/lib/share";

/** Public JSON for share links (signed photo URLs require service role on server). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = await getSharePageData(token);
  if (!data) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

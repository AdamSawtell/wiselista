import { loadCaptureSession } from "@/lib/capture";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await loadCaptureSession(token);
  if (!session) {
    return NextResponse.json({ error: "Capture link not found or expired" }, { status: 404 });
  }
  return NextResponse.json(session);
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Sell functionality is not yet available. Coming soon!" }, { status: 400 });
}

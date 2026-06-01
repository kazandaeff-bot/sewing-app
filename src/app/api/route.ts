import { NextResponse } from "next/server";

// Health check endpoint — returns OK status for monitoring/load balancers
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}

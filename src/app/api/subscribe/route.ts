import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const SubscribeSchema = z.object({
  legs: z.array(z.any()).min(1).max(6),
  filters: z.any(),
  flexibility: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  pricePremiumPct: z.number(),
  adults: z.number(),
  currency: z.string(),
  email: z.string().email(),
  alertThreshold: z.number().min(1).max(50).default(10),
  digestEnabled: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { email, alertThreshold, digestEnabled, legs, filters, flexibility, ...rest } = parsed.data;

    const saved = await prisma.savedSearch.create({
      data: {
        email,
        legs: legs as object,
        filters: filters as object,
        flexibility,
        alertThreshold,
        digestEnabled,
        active: true,
      },
    });

    return NextResponse.json({ success: true, token: saved.token });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 });
  }
}

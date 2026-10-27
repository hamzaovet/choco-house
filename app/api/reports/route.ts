import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "today";

    const now = new Date();
    let startDate: Date;

    if (range === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (range === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // today
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    }

    const [orders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: startDate }, status: { not: "cancelled" } },
        select: { total: true, subtotal: true, deliveryFee: true, status: true, createdAt: true, paymentMethod: true },
      }),
      prisma.expense.findMany({
        where: { createdAt: { gte: startDate } },
        select: { amount: true, category: true },
      }),
    ]);

    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalDelivery = orders.reduce((s, o) => s + o.deliveryFee, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    const byPayment = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
      return acc;
    }, {});

    return NextResponse.json({
      totalRevenue,
      totalDelivery,
      totalExpenses,
      netProfit,
      ordersCount: orders.length,
      byStatus,
      byPayment,
      orders: orders.slice(0, 50),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const audits = await prisma.inventoryAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(audits);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      periodStart,
      periodEnd,
      items, // array of { ingredientId, name, unit, prevQty, actualQty, costPerUnit }
      recordedBy,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "لا توجد أصناف في جلسة التحديث" }, { status: 400 });
    }

    const auditDate = periodEnd || new Date().toISOString().split("T")[0];
    const auditTitle = title || `جرد استهلاك المخزن (${auditDate})`;

    let totalConsumedCost = 0;
    const processedItems = [];

    // Process each ingredient
    for (const item of items) {
      const prevQty = parseFloat(item.prevQty) || 0;
      const actualQty = parseFloat(item.actualQty);
      const costPerUnit = parseFloat(item.costPerUnit) || 0;

      // Consumed quantity is the difference (only if positive consumption)
      const consumedQty = Math.max(0, Math.round((prevQty - actualQty) * 1000) / 1000);
      const itemCost = Math.round(consumedQty * costPerUnit * 100) / 100;

      totalConsumedCost += itemCost;

      processedItems.push({
        ingredientId: item.ingredientId,
        name: item.name,
        unit: item.unit,
        prevQty,
        actualQty,
        consumedQty,
        costPerUnit,
        totalCost: itemCost,
      });

      // Update the ingredient in DB to match the actual inventory count
      if (!isNaN(actualQty)) {
        await prisma.ingredient.update({
          where: { id: item.ingredientId },
          data: {
            quantity: actualQty,
          },
        });
      }
    }

    totalConsumedCost = Math.round(totalConsumedCost * 100) / 100;

    // Automatically record this consumption cost as an Expense so it flows to Reports & Net Profit!
    let createdExpenseId: string | undefined = undefined;
    if (totalConsumedCost > 0) {
      const expense = await prisma.expense.create({
        data: {
          description: `تكلفة خامات مستهلكة (${auditTitle})`,
          amount: totalConsumedCost,
          category: "خامات ومشتريات 🍫",
          expenseDate: auditDate,
          recordedBy: recordedBy || "المالك",
        },
      });
      createdExpenseId = expense.id;
    }

    // Save the Audit Session record in database
    const auditRecord = await prisma.inventoryAudit.create({
      data: {
        title: auditTitle,
        periodStart: periodStart || null,
        periodEnd: periodEnd || auditDate,
        totalCost: totalConsumedCost,
        itemsCount: processedItems.length,
        items: JSON.stringify(processedItems),
        recordedBy: recordedBy || "المالك",
        expenseId: createdExpenseId || null,
      },
    });

    return NextResponse.json({
      success: true,
      audit: auditRecord,
      totalCost: totalConsumedCost,
      items: processedItems,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

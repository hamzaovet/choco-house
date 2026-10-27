import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(purchases);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      ingredientId,
      quantity,
      unitPrice,
      invoiceNumber,
      supplier,
      notes,
      recordedBy,
      recordAsExpense = false,
    } = body;

    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);

    if (!ingredientId || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "برجاء التأكد من اختيار الخامة وإدخال كمية وسعر شراء صحيحين" },
        { status: 400 }
      );
    }

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      return NextResponse.json({ error: "الخامة غير موجودة" }, { status: 404 });
    }

    const prevQty = ingredient.quantity;
    const prevCost = ingredient.costPerUnit;
    const totalPurchaseCost = qty * price;
    const newQty = prevQty + qty;

    // Weighted Average Cost (WAC) formula:
    // NewAvg = (PrevQty * PrevCost + Qty * Price) / (PrevQty + Qty)
    let newAvgCost = price;
    if (newQty > 0) {
      const prevTotalValue = Math.max(0, prevQty) * prevCost;
      newAvgCost = Math.round(((prevTotalValue + totalPurchaseCost) / newQty) * 100) / 100;
    }

    // Optional: create expense entry
    let createdExpenseId: string | undefined = undefined;
    if (recordAsExpense) {
      const expense = await prisma.expense.create({
        data: {
          description: `فاتورة شراء خامات: ${ingredient.name} (${qty} ${ingredient.unit})`,
          amount: totalPurchaseCost,
          category: "خامات ومشتريات 🍫",
          expenseDate: new Date().toISOString().split("T")[0],
          recordedBy: recordedBy || "المالك",
        },
      });
      createdExpenseId = expense.id;
    }

    // Update ingredient with new quantity and new weighted average cost
    const updatedIngredient = await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        quantity: newQty,
        costPerUnit: newAvgCost,
      },
    });

    // Record purchase transaction
    const purchase = await prisma.purchase.create({
      data: {
        ingredientId,
        ingredientName: ingredient.name,
        quantity: qty,
        unitPrice: price,
        totalCost: totalPurchaseCost,
        prevQty,
        newQty,
        prevCost,
        newAvgCost,
        invoiceNumber: invoiceNumber || null,
        supplier: supplier || null,
        notes: notes || null,
        recordedBy: recordedBy || "المالك",
        expenseId: createdExpenseId || null,
      },
    });

    return NextResponse.json({
      success: true,
      ingredient: updatedIngredient,
      purchase,
      prevAvgCost: prevCost,
      newAvgCost,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

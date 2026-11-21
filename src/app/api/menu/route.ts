import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { MENU_ITEMS, MenuItem } from "@/data/menu";

const DATA_PATH = path.join(process.cwd(), "src", "data", "menu-data.json");

async function getMenuItems(): Promise<MenuItem[]> {
  try {
    const data = await readFile(DATA_PATH, "utf-8");
    const items = JSON.parse(data);
    return Array.isArray(items) ? items : MENU_ITEMS;
  } catch (err) {
    const initialItems = MENU_ITEMS.map((item) => ({
      ...item,
      isAvailable: true,
    }));
    try {
      await writeFile(DATA_PATH, JSON.stringify(initialItems, null, 2), "utf-8");
    } catch (writeErr) {
      console.error("Failed to write initial menu-data.json", writeErr);
    }
    return initialItems;
  }
}

async function saveMenuItems(items: MenuItem[]): Promise<boolean> {
  try {
    await writeFile(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save menu items", err);
    return false;
  }
}

export async function GET() {
  const items = await getMenuItems();
  return NextResponse.json({ success: true, items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = await getMenuItems();

    if (body.action === "reset") {
      const resetItems = MENU_ITEMS.map((item) => ({
        ...item,
        isAvailable: true,
      }));
      await saveMenuItems(resetItems);
      return NextResponse.json({ success: true, items: resetItems });
    }

    if (body.action === "add" || body.action === "create") {
      const newItem: MenuItem = {
        ...body.item,
        id: body.item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isAvailable: body.item.isAvailable !== undefined ? body.item.isAvailable : true,
      };
      const updated = [newItem, ...items];
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated, newItem });
    }

    if (body.action === "update" || body.action === "edit") {
      const itemToUpdate: MenuItem = body.item;
      if (!itemToUpdate || !itemToUpdate.id) {
        return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
      }
      const updated = items.map((i) => (i.id === itemToUpdate.id ? { ...i, ...itemToUpdate } : i));
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated });
    }

    if (body.action === "delete") {
      const id = body.id;
      if (!id) {
        return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
      }
      const updated = items.filter((i) => i.id !== id);
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated });
    }

    if (body.action === "toggleStock") {
      const { id, isAvailable } = body;
      const updated = items.map((i) => {
        if (i.id === id) {
          const newStatus = isAvailable !== undefined ? isAvailable : !(i.isAvailable !== false);
          return { ...i, isAvailable: newStatus };
        }
        return i;
      });
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated });
    }

    if (Array.isArray(body.items)) {
      await saveMenuItems(body.items);
      return NextResponse.json({ success: true, items: body.items });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("API /api/menu POST error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const items = await getMenuItems();
    const itemToUpdate: MenuItem = body.item || body;
    if (!itemToUpdate?.id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }
    const updated = items.map((i) => (i.id === itemToUpdate.id ? { ...i, ...itemToUpdate } : i));
    await saveMenuItems(updated);
    return NextResponse.json({ success: true, items: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const items = await getMenuItems();

    if (id) {
      const updated = items.filter((i) => i.id !== id);
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.id) {
      const updated = items.filter((i) => i.id !== body.id);
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated });
    }

    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

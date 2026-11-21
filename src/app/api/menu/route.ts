import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { MENU_ITEMS, MenuItem } from "@/data/menu";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Dual storage paths: /tmp for serverless/Netlify, local src/data for localhost
const LOCAL_PATH = path.join(process.cwd(), "src", "data", "menu-data.json");
const TMP_PATH = path.join(os.tmpdir(), "apni-rasoi-menu.json");

// In-memory module cache for sub-millisecond responses
let memoryCache: MenuItem[] | null = null;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

async function getMenuItems(): Promise<MenuItem[]> {
  // 1. Fast path: return in-memory cache if available
  if (memoryCache && Array.isArray(memoryCache) && memoryCache.length > 0) {
    return memoryCache;
  }

  // 2. Try reading from /tmp (persists during container lifetime on Netlify)
  try {
    const tmpData = await readFile(TMP_PATH, "utf-8");
    const parsed = JSON.parse(tmpData);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryCache = parsed;
      return parsed;
    }
  } catch {}

  // 3. Try reading from project workspace file
  try {
    const localData = await readFile(LOCAL_PATH, "utf-8");
    const parsed = JSON.parse(localData);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryCache = parsed;
      return parsed;
    }
  } catch {}

  // 4. Fallback to default MENU_ITEMS
  const defaultItems = MENU_ITEMS.map((item) => ({
    ...item,
    isAvailable: true,
  }));
  memoryCache = defaultItems;
  return defaultItems;
}

async function saveMenuItems(items: MenuItem[]): Promise<boolean> {
  // Update memory immediately
  memoryCache = items;

  // Asynchronously write to /tmp and local file without blocking
  try {
    await writeFile(TMP_PATH, JSON.stringify(items), "utf-8");
  } catch {}

  try {
    await writeFile(LOCAL_PATH, JSON.stringify(items, null, 2), "utf-8");
  } catch {}

  return true;
}

export async function GET() {
  const items = await getMenuItems();
  return NextResponse.json({ success: true, items }, { headers: NO_CACHE_HEADERS });
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
      return NextResponse.json({ success: true, items: resetItems }, { headers: NO_CACHE_HEADERS });
    }

    if (body.action === "add" || body.action === "create") {
      const newItem: MenuItem = {
        ...body.item,
        id: body.item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isAvailable: body.item.isAvailable !== undefined ? body.item.isAvailable : true,
      };
      const updated = [newItem, ...items];
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated, newItem }, { headers: NO_CACHE_HEADERS });
    }

    if (body.action === "update" || body.action === "edit") {
      const itemToUpdate: MenuItem = body.item;
      if (!itemToUpdate || !itemToUpdate.id) {
        return NextResponse.json({ error: "Item ID is required" }, { status: 400, headers: NO_CACHE_HEADERS });
      }
      const updated = items.map((i) => (i.id === itemToUpdate.id ? { ...i, ...itemToUpdate } : i));
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated }, { headers: NO_CACHE_HEADERS });
    }

    if (body.action === "delete") {
      const id = body.id;
      if (!id) {
        return NextResponse.json({ error: "Item ID is required" }, { status: 400, headers: NO_CACHE_HEADERS });
      }
      const updated = items.filter((i) => i.id !== id);
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated }, { headers: NO_CACHE_HEADERS });
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
      return NextResponse.json({ success: true, items: updated }, { headers: NO_CACHE_HEADERS });
    }

    if (Array.isArray(body.items)) {
      await saveMenuItems(body.items);
      return NextResponse.json({ success: true, items: body.items }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("API /api/menu POST error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const items = await getMenuItems();
    const itemToUpdate: MenuItem = body.item || body;
    if (!itemToUpdate?.id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const updated = items.map((i) => (i.id === itemToUpdate.id ? { ...i, ...itemToUpdate } : i));
    await saveMenuItems(updated);
    return NextResponse.json({ success: true, items: updated }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500, headers: NO_CACHE_HEADERS });
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
      return NextResponse.json({ success: true, items: updated }, { headers: NO_CACHE_HEADERS });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.id) {
      const updated = items.filter((i) => i.id !== body.id);
      await saveMenuItems(updated);
      return NextResponse.json({ success: true, items: updated }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ error: "Item ID is required" }, { status: 400, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { MENU_ITEMS, MenuItem } from "@/data/menu";
import { getStore } from "@netlify/blobs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_PATH = path.join(process.cwd(), "src", "data", "menu-data.json");
const STORE_NAME = "apni-rasoi-menu";
const STORE_KEY = "menu_items";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

// Helper to get Netlify Blob store safely
function getNetlifyStore() {
  try {
    return getStore(STORE_NAME);
  } catch (e) {
    return null;
  }
}

async function getMenuItems(): Promise<MenuItem[]> {
  // 1. Try Netlify Blobs (persists across Netlify serverless instances)
  const store = getNetlifyStore();
  if (store) {
    try {
      const blobItems = (await store.get(STORE_KEY, { type: "json" })) as MenuItem[] | null;
      if (blobItems && Array.isArray(blobItems) && blobItems.length > 0) {
        return blobItems;
      }
    } catch (blobErr) {
      // Netlify Blobs might not be configured in local dev, which is normal
    }
  }

  // 2. Try local file storage (for localhost dev)
  try {
    const data = await readFile(DATA_PATH, "utf-8");
    const items = JSON.parse(data);
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
  } catch (fileErr) {
    // File not found or unreadable
  }

  // 3. Fallback to default MENU_ITEMS
  const initialItems = MENU_ITEMS.map((item) => ({
    ...item,
    isAvailable: true,
  }));
  return initialItems;
}

async function saveMenuItems(items: MenuItem[]): Promise<boolean> {
  let savedToNetlify = false;
  let savedToFile = false;

  // 1. Save to Netlify Blobs
  const store = getNetlifyStore();
  if (store) {
    try {
      await store.setJSON(STORE_KEY, items);
      savedToNetlify = true;
    } catch (blobErr) {
      // Netlify Blobs error or local dev
    }
  }

  // 2. Try saving to local file system
  try {
    await writeFile(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
    savedToFile = true;
  } catch (fileErr) {
    // Read-only filesystem on Netlify Lambda is caught safely
  }

  return savedToNetlify || savedToFile;
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

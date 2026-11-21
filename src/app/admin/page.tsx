"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { MenuItem, MENU_ITEMS } from "@/data/menu";
import { supabase } from "@/lib/supabase";
import {
  Lock,
  Settings,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  LogOut,
  Upload,
  Image as ImageIcon,
  X,
  RefreshCw,
  Tag,
  DollarSign,
  Utensils,
  Layers,
  Sparkles,
} from "lucide-react";

const DEFAULT_CATEGORIES = ["Main Course", "Appetizers", "Drinks"];

const SAMPLE_IMAGES = [
  { name: "Veg Burger", url: "/images/veg_burger.png" },
  { name: "Cheese Burger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400&h=300" },
  { name: "Paneer Burger", url: "/images/paneer_burger.png" },
  { name: "Pasta", url: "/images/pasta.png" },
  { name: "White Sauce Pasta", url: "/images/white_sauce_pasta.png" },
  { name: "Hakka Noodles", url: "/images/hakka_noodles.png" },
  { name: "French Fries", url: "/images/french_fries.png" },
  { name: "Samosa", url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=400&h=300" },
  { name: "Pizza Samosa", url: "/images/pizza_samosa.png" },
  { name: "Dahi k Sholay", url: "/images/dahi_k_sholay.png" },
  { name: "Vada Pao", url: "/images/vada_pao.png" },
  { name: "Frozen Bread Pakoda", url: "/images/BreadPakodaFrozen.png" },
  { name: "Veg Cutlet", url: "/images/cutlet.png" },
  { name: "Masala Chaas", url: "/images/masala_chaas.png" },
  { name: "Lassi", url: "/images/lassi.png" },
  { name: "Cold Coffee", url: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=400&h=300" },
];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Main Course");
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formHasVariants, setFormHasVariants] = useState(false);
  const [formPrice, setFormPrice] = useState<number | string>("");
  const [formHalfPrice, setFormHalfPrice] = useState<number | string>("");
  const [formFullPrice, setFormFullPrice] = useState<number | string>("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showSampleImages, setShowSampleImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Check session storage on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem("admin_authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "123") {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
  };

  // Fetch items from API
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setItems(MENU_ITEMS.map((item) => ({ ...item, isAvailable: true })));
      }
    } catch (err) {
      console.error("Failed to load menu items", err);
      setItems(MENU_ITEMS.map((item) => ({ ...item, isAvailable: true })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchItems();
    }
  }, [isAuthenticated]);

  // Dynamic categories list
  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const isAvailable = item.isAvailable !== false;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in_stock" && isAvailable) ||
        (stockFilter === "out_of_stock" && !isAvailable);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, searchQuery, categoryFilter, stockFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const inStock = items.filter((i) => i.isAvailable !== false).length;
    const outOfStock = total - inStock;
    const totalCategories = categories.length;
    return { total, inStock, outOfStock, totalCategories };
  }, [items, categories]);

  // Toggle Stock Status
  const handleToggleStock = async (item: MenuItem) => {
    const currentStatus = item.isAvailable !== false;
    const newStatus = !currentStatus;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: newStatus } : i))
    );

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleStock",
          id: item.id,
          isAvailable: newStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update stock");
      }
      showToast(
        `"${item.name}" marked as ${newStatus ? "IN STOCK" : "OUT OF STOCK"}`
      );

      // Attempt background Supabase update
      try {
        await supabase
          .from("menu_status")
          .upsert({ id: item.id, is_available: newStatus });
      } catch (sbErr) {
        // Silently skip if Supabase is offline
      }
    } catch (err: any) {
      // Revert on failure
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: currentStatus } : i))
      );
      showToast("Failed to update status", "error");
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingItem(null);
    setFormName("");
    setFormCategory("Main Course");
    setFormCustomCategory("");
    setFormHasVariants(false);
    setFormPrice("");
    setFormHalfPrice("");
    setFormFullPrice("");
    setFormDescription("");
    setFormImage("/images/veg_burger.png");
    setFormIsAvailable(true);
    setShowSampleImages(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);

    if (DEFAULT_CATEGORIES.includes(item.category)) {
      setFormCategory(item.category);
      setFormCustomCategory("");
    } else {
      setFormCategory("Custom");
      setFormCustomCategory(item.category);
    }

    if (item.hasVariants && typeof item.price === "object") {
      setFormHasVariants(true);
      setFormHalfPrice(item.price.half);
      setFormFullPrice(item.price.full);
      setFormPrice("");
    } else {
      setFormHasVariants(false);
      setFormPrice(typeof item.price === "number" ? item.price : 100);
      setFormHalfPrice("");
      setFormFullPrice("");
    }

    setFormDescription(item.description || "");
    setFormImage(item.image || "");
    setFormIsAvailable(item.isAvailable !== false);
    setShowSampleImages(false);
    setIsModalOpen(true);
  };

  // Handle local image file upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setFormImage(data.url);
        showToast("Image uploaded successfully!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload image", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save Food Item (Add or Edit)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showToast("Please enter an item name", "error");
      return;
    }

    const finalCategory =
      formCategory === "Custom"
        ? formCustomCategory.trim() || "Main Course"
        : formCategory;

    let finalPrice: number | { half: number; full: number };
    if (formHasVariants) {
      const half = Number(formHalfPrice);
      const full = Number(formFullPrice);
      if (isNaN(half) || half <= 0 || isNaN(full) || full <= 0) {
        showToast("Please enter valid Half and Full prices", "error");
        return;
      }
      finalPrice = { half, full };
    } else {
      const price = Number(formPrice);
      if (isNaN(price) || price < 0) {
        showToast("Please enter a valid price", "error");
        return;
      }
      finalPrice = price;
    }

    const finalImage = formImage.trim() || "/images/veg_burger.png";

    const itemPayload: MenuItem = {
      id: editingItem ? editingItem.id : `item_${Date.now()}`,
      name: formName.trim(),
      category: finalCategory,
      price: finalPrice,
      hasVariants: formHasVariants,
      description: formDescription.trim() || undefined,
      image: finalImage,
      isAvailable: formIsAvailable,
    };

    setIsSubmitting(true);
    try {
      const action = editingItem ? "update" : "add";
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, item: itemPayload }),
      });
      const data = await res.json();

      if (data.success) {
        setItems(data.items);
        setIsModalOpen(false);
        showToast(
          editingItem
            ? `Updated "${itemPayload.name}" successfully!`
            : `Added "${itemPayload.name}" to menu!`
        );
      } else {
        throw new Error(data.error || "Save failed");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save item", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Food Item
  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: itemToDelete.id }),
      });
      const data = await res.json();

      if (data.success) {
        setItems(data.items);
        showToast(`Deleted "${itemToDelete.name}" from menu`);
        setItemToDelete(null);
      } else {
        throw new Error(data.error || "Failed to delete item");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete item", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset Menu to defaults
  const handleResetMenu = async () => {
    if (
      !confirm(
        "Are you sure you want to restore the default menu items? Any custom changes or newly added items will be reset."
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        showToast("Menu successfully reset to original items");
      }
    } catch (err) {
      showToast("Failed to reset menu", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-dark-paper p-8 rounded-2xl border border-dark-border shadow-2xl max-w-sm w-full"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-primary/20 p-4 rounded-full border border-primary/30">
              <Lock className="text-primary" size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-1">
            Apni Rasoi Admin
          </h1>
          <p className="text-xs text-gray-400 text-center mb-6">
            Sign in to manage inventory, items, and pricing
          </p>

          <div className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Password (123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-sm"
              />
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20"
            >
              Access Dashboard
            </button>
          </div>
          <p className="text-gray-500 text-xs text-center mt-6">
            Default passcode: <span className="text-gray-300 font-mono">123</span>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white p-4 md:p-8">
      {/* TOAST NOTIFICATION */}
      <div
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 transition-all duration-300 ${
          toast
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-10 pointer-events-none"
        } ${
          toast?.type === "error"
            ? "bg-red-600 text-white shadow-red-600/40"
            : "bg-green-600 text-white shadow-green-600/40"
        }`}
      >
        {toast?.type === "error" ? (
          <AlertCircle size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}
        <span>{toast?.message}</span>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* TOP BAR / NAVIGATION */}
        <div className="bg-dark-paper border border-dark-border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 border border-primary/30 rounded-xl text-primary">
              <Settings size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-800 font-semibold">
                  Active
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Apni Rasoi • Menu Management & Stock Control
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-dark border border-dark-border hover:border-gray-500 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <ExternalLink size={16} />
              <span>View Store</span>
            </Link>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-all shadow-lg shadow-primary/25 active:scale-95"
            >
              <Plus size={18} />
              <span>Add Food Item</span>
            </button>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2.5 rounded-xl bg-dark border border-dark-border hover:border-red-500 hover:text-red-400 text-gray-400 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-dark-paper border border-dark-border rounded-xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs uppercase font-semibold">Total Items</span>
              <Utensils size={16} className="text-primary" />
            </div>
            <div className="text-2xl font-black text-white">{stats.total}</div>
          </div>

          <div className="bg-dark-paper border border-dark-border rounded-xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs uppercase font-semibold">In Stock</span>
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <div className="text-2xl font-black text-green-400">
              {stats.inStock}
            </div>
          </div>

          <div className="bg-dark-paper border border-dark-border rounded-xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs uppercase font-semibold">Out of Stock</span>
              <AlertCircle size={16} className="text-red-500" />
            </div>
            <div className="text-2xl font-black text-red-400">
              {stats.outOfStock}
            </div>
          </div>

          <div className="bg-dark-paper border border-dark-border rounded-xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs uppercase font-semibold">Categories</span>
              <Layers size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400">
              {stats.totalCategories}
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-dark-paper border border-dark-border rounded-xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search food item by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Stock Availability Filter */}
            <div className="flex items-center bg-dark p-1 rounded-xl border border-dark-border self-start md:self-auto">
              <button
                onClick={() => setStockFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === "all"
                    ? "bg-dark-paper text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStockFilter("in_stock")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === "in_stock"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-green-400"
                }`}
              >
                In Stock ({stats.inStock})
              </button>
              <button
                onClick={() => setStockFilter("out_of_stock")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  stockFilter === "out_of_stock"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-red-400"
                }`}
              >
                Out of Stock ({stats.outOfStock})
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetMenu}
              title="Reset to default menu"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-gray-200 bg-dark hover:bg-dark-border/60 border border-dark-border rounded-xl transition-colors shrink-0"
            >
              <RefreshCw size={14} />
              <span>Reset Defaults</span>
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-gray-500 font-semibold shrink-0">Category:</span>
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                categoryFilter === "all"
                  ? "bg-primary text-white"
                  : "bg-dark text-gray-400 hover:text-white border border-dark-border"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary text-white"
                    : "bg-dark text-gray-400 hover:text-white border border-dark-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FOOD ITEMS LIST / CARDS */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Loading food items...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-dark-paper border border-dark-border rounded-2xl p-12 text-center text-gray-400 space-y-3">
            <Utensils size={40} className="mx-auto text-gray-600" />
            <h3 className="text-lg font-bold text-white">No food items found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {searchQuery || categoryFilter !== "all" || stockFilter !== "all"
                ? "Try adjusting your search query or filters to find what you're looking for."
                : "No items currently in the menu. Click '+ Add Food Item' to get started."}
            </p>
            {(searchQuery || categoryFilter !== "all" || stockFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setStockFilter("all");
                }}
                className="text-primary text-xs font-bold hover:underline pt-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const isAvailable = item.isAvailable !== false;

              return (
                <div
                  key={item.id}
                  className={`bg-dark-paper border transition-all rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isAvailable
                      ? "border-dark-border hover:border-dark-border/80"
                      : "border-red-950/60 bg-red-950/10"
                  }`}
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-dark shrink-0 border border-dark-border">
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-all ${
                          !isAvailable && "opacity-50 grayscale"
                        }`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/images/veg_burger.png";
                        }}
                      />
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-[9px] font-black uppercase text-red-400 bg-black/80 px-1 py-0.5 rounded">
                            OUT
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 border border-green-500 flex justify-center items-center shrink-0">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        </span>
                        <h3 className="font-bold text-base text-white truncate">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="bg-dark px-2 py-0.5 rounded border border-dark-border text-gray-300">
                          {item.category}
                        </span>
                        {item.description && (
                          <span className="truncate text-gray-500">
                            • {item.description}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-gray-200">
                        {typeof item.price === "number" ? (
                          <span className="text-white font-bold">₹{item.price}</span>
                        ) : (
                          <span className="text-gray-300">
                            Half: <strong className="text-white">₹{item.price.half}</strong> | Full:{" "}
                            <strong className="text-white">₹{item.price.full}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Stock Toggle & Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-dark-border">
                    {/* IN STOCK / OUT OF STOCK BUTTON */}
                    <button
                      onClick={() => handleToggleStock(item)}
                      style={{
                        backgroundColor: isAvailable ? "#22c55e" : "#ef4444",
                        color: "#ffffff",
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all hover:opacity-90 active:scale-95 shadow-sm"
                    >
                      {isAvailable ? (
                        <>
                          <CheckCircle2 size={15} />
                          <span>IN STOCK</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={15} />
                          <span>OUT OF STOCK</span>
                        </>
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(item)}
                      title="Edit Item & Image"
                      className="p-2 rounded-lg bg-dark hover:bg-dark-border text-gray-300 hover:text-white border border-dark-border transition-colors"
                    >
                      <Pencil size={15} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setItemToDelete(item)}
                      title="Delete Item"
                      className="p-2 rounded-lg bg-dark hover:bg-red-950 text-gray-400 hover:text-red-400 border border-dark-border hover:border-red-900 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT FOOD ITEM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-dark-paper border border-dark-border rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8 relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/20 text-primary rounded-lg">
                  {editingItem ? <Pencil size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {editingItem ? "Edit Food Item" : "Add New Food Item"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {editingItem
                      ? "Update item information, pricing, or change image"
                      : "Add a delicious new dish to the Apni Rasoi menu"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                  Item Name <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Paneer Tikka Burger"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                    Category <span className="text-primary">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-dark border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="Custom">+ Add New Category</option>
                  </select>
                </div>

                {formCategory === "Custom" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                      New Category Name <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Desserts, Thali, Snacks"
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      className="w-full bg-dark border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                    Description / Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 300ML, 6pcs, Served with chutney"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-dark border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Pricing & Portion Configuration */}
              <div className="bg-dark p-4 rounded-xl border border-dark-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-gray-300 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-primary" />
                    Price Configuration
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={formHasVariants}
                      onChange={(e) => setFormHasVariants(e.target.checked)}
                      className="accent-primary w-4 h-4 rounded"
                    />
                    <span>Has Half & Full Portions</span>
                  </label>
                </div>

                {!formHasVariants ? (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Fixed Price (₹) <span className="text-primary">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      placeholder="100"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full bg-dark-paper border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Half Portion Price (₹) <span className="text-primary">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        placeholder="80"
                        value={formHalfPrice}
                        onChange={(e) => setFormHalfPrice(e.target.value)}
                        className="w-full bg-dark-paper border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Full Portion Price (₹) <span className="text-primary">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        placeholder="150"
                        value={formFullPrice}
                        onChange={(e) => setFormFullPrice(e.target.value)}
                        className="w-full bg-dark-paper border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* IMAGE MANAGEMENT SECTION */}
              <div className="bg-dark p-4 rounded-xl border border-dark-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 uppercase flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-primary" />
                    Food Image
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSampleImages(!showSampleImages)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    {showSampleImages ? "Hide Suggestions" : "Pick from Presets"}
                  </button>
                </div>

                {/* Image Preview & Upload Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-dark-paper border border-dark-border shrink-0 relative group">
                    <img
                      src={formImage || "/images/veg_burger.png"}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/images/veg_burger.png";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white">
                      Preview
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    {/* URL Input */}
                    <div>
                      <input
                        type="text"
                        placeholder="Image URL or /images/..."
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        className="w-full bg-dark-paper border border-dark-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    {/* Local File Upload Button */}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="flex items-center gap-2 px-3 py-2 bg-dark-paper hover:bg-dark-border border border-dark-border rounded-xl text-xs font-medium text-gray-200 transition-colors"
                      >
                        <Upload size={14} className="text-primary" />
                        <span>
                          {isUploadingImage
                            ? "Uploading Image..."
                            : "Upload from Computer"}
                        </span>
                      </button>
                      <span className="text-[11px] text-gray-500">
                        PNG, JPG, WebP supported
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preset sample images drawer */}
                {showSampleImages && (
                  <div className="pt-2 border-t border-dark-border">
                    <p className="text-[11px] text-gray-400 mb-2">
                      Click any photo below to instantly use it:
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 bg-dark-paper rounded-lg border border-dark-border">
                      {SAMPLE_IMAGES.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormImage(sample.url);
                            setShowSampleImages(false);
                          }}
                          className={`relative group rounded-lg overflow-hidden border aspect-square ${
                            formImage === sample.url
                              ? "border-primary ring-2 ring-primary"
                              : "border-dark-border hover:border-gray-500"
                          }`}
                        >
                          <img
                            src={sample.url}
                            alt={sample.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-white px-1 truncate text-center">
                            {sample.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Initial Stock Toggle */}
              <div className="flex items-center justify-between bg-dark p-4 rounded-xl border border-dark-border">
                <div>
                  <span className="font-semibold text-sm block">Initial Stock Availability</span>
                  <span className="text-xs text-gray-400">
                    Set whether this item is currently available for ordering
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsAvailable(!formIsAvailable)}
                  style={{
                    backgroundColor: formIsAvailable ? "#22c55e" : "#ef4444",
                    color: "#ffffff",
                  }}
                  className="px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  {formIsAvailable ? (
                    <>
                      <CheckCircle2 size={15} /> IN STOCK
                    </>
                  ) : (
                    <>
                      <AlertCircle size={15} /> OUT OF STOCK
                    </>
                  )}
                </button>
              </div>

              {/* Footer Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-dark-border hover:bg-dark text-sm font-medium text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{editingItem ? "Save Changes" : "Add to Menu"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-paper border border-dark-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">Delete Food Item?</h3>
              <p className="text-sm text-gray-400">
                Are you sure you want to remove{" "}
                <span className="text-white font-semibold">
                  "{itemToDelete.name}"
                </span>{" "}
                from the menu? This cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-dark-border">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 rounded-xl border border-dark-border hover:bg-dark text-sm font-medium text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                {isDeleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

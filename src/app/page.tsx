"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  ShoppingCart, 
  Minus, 
  Plus, 
  Info, 
  Phone,
  UtensilsCrossed,
  ChefHat,
  Coffee,
  CheckCircle2,
  Trash2,
  Search,
  AlertCircle
} from "lucide-react";
import { MENU_ITEMS, MenuItem } from "@/data/menu";
import { supabase } from "@/lib/supabase";

type CartItem = {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  variant?: "half" | "full";
};

const DEFAULT_CATEGORIES = ["Main Course", "Appetizers", "Drinks"];

export default function ApniRasoi() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("apni_rasoi_menu_cache");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return MENU_ITEMS;
  });
  const [activeCategory, setActiveCategory] = useState<string>("Main Course");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isBulkOrder, setIsBulkOrder] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stock status from Supabase
  const [stockStatus, setStockStatus] = useState<Record<string, boolean>>({});

  // Variant selections per menu item (for items with half/full)
  const [variants, setVariants] = useState<Record<string, "half" | "full">>({});

  // Dynamic categories list based on available items
  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    menuItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [menuItems]);

  const isItemOutOfStock = (item: MenuItem) => {
    if (stockStatus[item.id] !== undefined) {
      return !stockStatus[item.id];
    }
    return item.isAvailable === false;
  };

  useEffect(() => {
    const syncFromCache = () => {
      if (typeof window !== "undefined") {
        try {
          const local = localStorage.getItem("apni_rasoi_menu_cache");
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMenuItems(parsed);
            }
          }
        } catch {}
      }
    };

    // Fast background sync with API
    const fetchMenu = async () => {
      try {
        const res = await fetch(`/api/menu?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setMenuItems(data.items);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("apni_rasoi_menu_cache", JSON.stringify(data.items));
            } catch {}
          }
        }
      } catch (err) {
        console.error("Failed to load dynamic menu", err);
      }
    };
    fetchMenu();

    // Re-fetch when user refocuses tab (e.g. after editing in Admin panel)
    const handleFocus = () => {
      syncFromCache();
      fetchMenu();
    };

    // Cross-tab real-time sync when Admin updates something
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "apni_rasoi_menu_cache" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMenuItems(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    // Fetch stock status on mount
    const fetchStock = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_status')
          .select('id, is_available');
        
        if (error) {
          console.error("Error fetching stock:", error);
          return;
        }

        if (data) {
          const statusMap: Record<string, boolean> = {};
          data.forEach(item => {
            statusMap[item.id] = item.is_available;
          });
          setStockStatus(statusMap);
        }
      } catch (err) {
        console.error("Failed to load stock status", err);
      }
    };
    
    fetchStock();
    
    // Optional: Subscribe to real-time changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_status' },
        (payload) => {
          const updatedRow = payload.new as { id: string; is_available: boolean };
          if (updatedRow && updatedRow.id) {
            setStockStatus(prev => ({
              ...prev,
              [updatedRow.id]: updatedRow.is_available
            }));
          }
        }
      )
      .subscribe();
      
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      supabase.removeChannel(channel);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const groupedMenu = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    categories.forEach((cat) => {
      const filteredItems = menuItems.filter(
        (item) => 
          item.category === cat && 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filteredItems.length > 0) {
        groups[cat] = filteredItems;
      }
    });
    return groups;
  }, [categories, menuItems, searchQuery]);

  const handleVariantChange = (menuId: string, variant: "half" | "full") => {
    setVariants((prev) => ({ ...prev, [menuId]: variant }));
  };

  const addToCart = (item: MenuItem) => {
    // Check if out of stock
    if (isItemOutOfStock(item)) return;

    let price = 0;
    let selectedVariant: "half" | "full" | undefined = undefined;
    let cartItemId = item.id;

    if (item.hasVariants && typeof item.price === "object") {
      selectedVariant = variants[item.id] || "full";
      price = item.price[selectedVariant];
      cartItemId = `${item.id}-${selectedVariant}`;
    } else if (typeof item.price === "number") {
      price = item.price;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.id === cartItemId);
      if (existing) {
        return prev.map((c) =>
          c.id === cartItemId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          menuItemId: item.id,
          name: item.name,
          price,
          quantity: 1,
          variant: selectedVariant,
        },
      ];
    });
    
    showToast(`Added ${item.name} to cart`);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.id === cartItemId) {
            return { ...c, quantity: Math.max(0, c.quantity + delta) };
          }
          return c;
        })
        .filter((c) => c.quantity > 0);
    });
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    let message = `*New Order: APNI RASOI*%0A%0A`;
    cart.forEach(item => {
      const variantText = item.variant ? ` (${item.variant})` : '';
      message += `${item.name}${variantText} x ${item.quantity} - ₹${item.price * item.quantity}%0A`;
    });
    
    message += `%0A*Total Amount: ₹${totalAmount}*`;
    if (isBulkOrder) {
      message += `%0A%0A*Note: This is a Bulk/Society Order inquiry.*`;
    }
    message += `%0A%0APlease let me know the estimated delivery time.`;

    const phoneNumber = "919616789607"; 
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-dark text-white pb-24 md:pb-0 flex flex-col relative">
      
      {/* TOAST NOTIFICATION */}
      <div 
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-green-500/30 flex items-center gap-2 transition-all duration-300 ${
          toastMessage ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10 pointer-events-none"
        }`}
      >
        <CheckCircle2 size={20} />
        {toastMessage}
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto md:pr-80 transition-all duration-300">
        
        {/* HERO SECTION */}
        <div className="relative h-64 md:h-80 w-full overflow-hidden">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1600&h=600" 
            alt="Apni Rasoi Hero" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-t from-dark to-transparent">
            
            <div className="absolute top-4 right-4 bg-green-600/90 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border border-green-400/50 backdrop-blur-md shadow-lg shadow-green-900/50">
              <span className="w-2.5 h-2.5 rounded-full bg-white block">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 block m-[2px]"></span>
              </span>
              100% PURE VEG
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tight">
              APNI <span className="text-primary">RASOI</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 font-medium mb-4">
              Authentic Home Cooked Food
            </p>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <CheckCircle2 size={18} className="text-green-400" />
              <span className="text-sm font-medium">Delivering to your doorstep & Bulk Society Orders</span>
            </div>
          </div>
        </div>

        {/* SEARCH & STICKY CATEGORY NAV */}
        <div className="sticky top-0 z-30 bg-dark/95 backdrop-blur-md border-b border-dark-border">
          <div className="p-4 max-w-3xl mx-auto border-b border-dark-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search for delicious food..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-paper border border-dark-border rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-white placeholder-gray-500"
              />
            </div>
          </div>

          <div className="py-3 px-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-4 max-w-3xl mx-auto">
              {categories.map((cat) => {
                const Icon = cat === "Main Course" ? UtensilsCrossed : cat === "Appetizers" ? ChefHat : cat === "Drinks" ? Coffee : UtensilsCrossed;
                if (searchQuery && !groupedMenu[cat]) return null;

                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      const element = document.getElementById(cat);
                      if (element) {
                        const y = element.getBoundingClientRect().top + window.scrollY - 140;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                      activeCategory === cat
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-dark-paper text-gray-400 hover:text-white hover:bg-dark-border"
                    }`}
                  >
                    <Icon size={16} />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MENU LIST */}
        <div className="p-4 space-y-12 max-w-3xl mx-auto mt-6">
          {Object.keys(groupedMenu).length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-white mb-2">No items found</h3>
              <p>We couldn't find anything matching "{searchQuery}".</p>
              <button 
                onClick={() => setSearchQuery("")}
                className="mt-4 text-primary font-medium hover:underline"
              >
                Clear Search
              </button>
            </div>
          ) : (
            categories.map((cat) => (
              groupedMenu[cat] && (
                <div key={cat} id={cat} className="scroll-mt-40">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-dark-border pb-2">
                    {cat}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedMenu[cat].map((item) => {
                      const isOutOfStock = isItemOutOfStock(item);
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`bg-dark-paper border border-dark-border rounded-2xl p-4 flex gap-4 transition-colors group ${
                            isOutOfStock ? "opacity-60 grayscale-[0.5]" : "hover:border-primary/50"
                          }`}
                        >
                          <div className="w-32 h-32 rounded-xl overflow-hidden shrink-0 bg-dark relative">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className={`w-full h-full object-cover transition-transform duration-500 ${!isOutOfStock && "group-hover:scale-110"}`}
                              loading="lazy"
                            />
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white font-bold text-xs px-2 py-1 bg-red-600/90 rounded border border-red-400 backdrop-blur-sm -rotate-12">
                                  SOLD OUT
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className={`font-bold text-lg leading-tight transition-colors flex items-center justify-between ${!isOutOfStock && "group-hover:text-primary"}`}>
                                {item.name}
                                <span className="w-2.5 h-2.5 border border-green-500 flex justify-center items-center shrink-0">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                </span>
                              </h3>
                              {item.description && (
                                <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                              )}
                              
                              <div className="mt-2 font-semibold text-gray-200">
                                {typeof item.price === "number" ? (
                                  <span>₹{item.price}</span>
                                ) : (
                                  <span className="text-sm text-gray-400 font-normal block">
                                    Half: ₹{item.price.half} | Full: ₹{item.price.full}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3">
                              {isOutOfStock ? (
                                <div className="text-red-400 text-sm font-medium flex items-center gap-1.5">
                                  <AlertCircle size={14} />
                                  Out of Stock
                                </div>
                              ) : item.hasVariants ? (
                                <div className="flex flex-col gap-2">
                                  <div className="flex bg-dark rounded-lg p-1 w-fit">
                                    <button 
                                      onClick={() => handleVariantChange(item.id, "half")}
                                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                        (variants[item.id] || "full") === "half" ? "bg-primary text-white" : "text-gray-400 hover:text-white"
                                      }`}
                                    >
                                      Half
                                    </button>
                                    <button 
                                      onClick={() => handleVariantChange(item.id, "full")}
                                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                        (variants[item.id] || "full") === "full" ? "bg-primary text-white" : "text-gray-400 hover:text-white"
                                      }`}
                                    >
                                      Full
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => addToCart(item)}
                                    className="bg-primary/10 text-primary hover:bg-primary hover:text-white w-fit px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
                                  >
                                    ADD +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(item)}
                                  className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
                                >
                                  ADD +
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))
          )}
        </div>
        
        {/* FOOTER */}
        <footer className="mt-12 bg-dark-paper border-t border-dark-border py-8 px-4">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">APNI <span className="text-primary">RASOI</span></h3>
              <p className="text-sm text-gray-400">Authentic Home Cooked Vegetarian Food</p>
            </div>
            <div className="text-sm text-gray-400 flex flex-col gap-1 items-center md:items-end">
              <span className="flex items-center gap-2"><Phone size={14}/> +91 96167 89607</span>
              <span>Available for Daily & Society Bulk Orders</span>
            </div>
          </div>
          <div className="max-w-3xl mx-auto mt-6 pt-4 border-t border-dark-border/50 text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} Apni Rasoi. All rights reserved.
          </div>
        </footer>
      </div>

      {/* MOBILE CART BUTTON */}
      {cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-4 rounded-full shadow-xl shadow-primary/30 flex items-center justify-between gap-4 w-[90%] z-40 font-bold active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2">
            <div className="bg-white/20 px-2 py-1 rounded-md text-sm">{totalItems}</div>
            <span>View Cart</span>
          </div>
          <div className="flex items-center gap-2">
            <span>₹{totalAmount}</span>
          </div>
        </button>
      )}

      {/* DESKTOP/MODAL CART SIDEBAR */}
      <>
        {/* Backdrop for mobile */}
        {isCartOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
        )}
        
        <div className={`
          fixed top-0 right-0 h-full w-full md:w-80 bg-dark-paper border-l border-dark-border z-50 flex flex-col shadow-2xl transition-transform duration-300
          ${isCartOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}>
          <div className="p-5 border-b border-dark-border flex justify-between items-center bg-dark">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary"/> 
              Your Order
            </h2>
            <button 
              className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-dark-border rounded-full"
              onClick={() => setIsCartOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4 opacity-60">
                <ShoppingCart size={48} />
                <p>Your cart is empty</p>
                <p className="text-sm text-center">Looks like you haven't added anything to your cart yet.</p>
              </div>
            ) : (
              <>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-sm">Placing a Bulk/Society Order?</span>
                    <div className="relative inline-block w-12 h-6 rounded-full bg-dark-border transition-colors">
                      <input 
                        type="checkbox" 
                        className="peer opacity-0 w-0 h-0"
                        checked={isBulkOrder}
                        onChange={(e) => setIsBulkOrder(e.target.checked)}
                      />
                      <span className={`absolute cursor-pointer top-1 left-1 bottom-1 w-4 bg-gray-400 rounded-full transition-all peer-checked:translate-x-6 peer-checked:bg-primary`}></span>
                    </div>
                  </label>
                  
                  {isBulkOrder && (
                    <div className="mt-3 text-xs text-gray-300 flex gap-2 items-start bg-dark/50 p-3 rounded-lg border border-dark-border">
                      <Info size={16} className="text-primary shrink-0 mt-0.5" />
                      <p>Bulk orders qualify for custom pricing! The final price and delivery timeline will be confirmed on WhatsApp.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 bg-dark rounded-xl p-3 border border-dark-border">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-medium text-sm leading-tight flex items-center gap-1">
                            {item.name}
                            {item.variant && (
                              <span className="text-[10px] uppercase bg-dark-paper px-1.5 py-0.5 rounded text-gray-400 border border-dark-border">
                                {item.variant}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">₹{item.price} x {item.quantity} = <span className="text-white font-medium">₹{item.price * item.quantity}</span></div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-dark-paper rounded-lg p-1 border border-dark-border">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:text-primary hover:bg-dark rounded transition-colors"
                          >
                            {item.quantity === 1 ? <Trash2 size={14} className="text-red-400"/> : <Minus size={14} />}
                          </button>
                          <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 text-primary hover:bg-dark rounded transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 border-t border-dark-border bg-dark-paper">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400">Total Amount</span>
                <span className="text-2xl font-bold">₹{totalAmount}</span>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-primary/20 active:scale-95"
              >
                <Phone size={20} />
                Order via WhatsApp
              </button>
            </div>
          )}
        </div>
      </>
    </div>
  );
}

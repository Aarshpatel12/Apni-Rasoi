"use client";

import React, { useState, useEffect } from "react";
import { MENU_ITEMS, MenuItem } from "@/data/menu";
import { supabase } from "@/lib/supabase";
import { Lock, Settings, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const [stockStatus, setStockStatus] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Simple password check (Note: For a real production app, use NextAuth or Supabase Auth)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "apni123") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStock();
    }
  }, [isAuthenticated]);

  const fetchStock = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_status')
        .select('id, is_available');
      
      if (error) throw error;

      if (data) {
        const statusMap: Record<string, boolean> = {};
        data.forEach(item => {
          statusMap[item.id] = item.is_available;
        });
        setStockStatus(statusMap);
      }
    } catch (err) {
      console.error("Failed to load stock status", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStock = async (item: MenuItem) => {
    const currentStatus = stockStatus[item.id] !== false; // defaults to true if undefined
    const newStatus = !currentStatus;

    // Optimistic UI update
    setStockStatus(prev => ({ ...prev, [item.id]: newStatus }));

    try {
      const { error } = await supabase
        .from('menu_status')
        .upsert({ id: item.id, is_available: newStatus });
        
      if (error) {
        // Revert on error
        setStockStatus(prev => ({ ...prev, [item.id]: currentStatus }));
        alert("Failed to update status in database. Make sure you have created the table in Supabase!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-dark-paper p-8 rounded-2xl border border-dark-border shadow-2xl max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/20 p-4 rounded-full">
              <Lock className="text-primary" size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-6">Admin Login</h1>
          
          <div className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors"
            >
              Login
            </button>
          </div>
          <p className="text-gray-500 text-xs text-center mt-6">Hint: The password is apni123</p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-dark-border">
          <Settings className="text-primary" size={28} />
          <h1 className="text-3xl font-bold">Inventory Management</h1>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading inventory...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MENU_ITEMS.map((item) => {
              const isAvailable = stockStatus[item.id] !== false; // defaults to true
              
              return (
                <div key={item.id} className="bg-dark-paper border border-dark-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleStock(item)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      isAvailable 
                        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" 
                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    }`}
                  >
                    {isAvailable ? (
                      <><CheckCircle2 size={16} /> IN STOCK</>
                    ) : (
                      <><AlertCircle size={16} /> OUT OF STOCK</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

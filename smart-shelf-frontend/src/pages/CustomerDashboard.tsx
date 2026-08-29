import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ShoppingBag, AlertCircle, ChefHat, RefreshCw, MessageSquare, Lightbulb, Bot } from 'lucide-react';
import { AIChatbotModal } from '../components/AIChatbotModal';

interface PurchaseItem {
  id: number;
  product_id: number;
  product_name: string;
  expiry_date: string;
  quantity: number;
  price_at_purchase: string;
  line_total: string;
}

interface Purchase {
  id: number;
  total_amount: string;
  created_at: string;
  items: PurchaseItem[];
}

interface Recipe {
  title: string;
  ingredients_used: string[];
  steps: string[];
}

interface RecipeSuggestionResponse {
  message?: string;
  detail?: string;
  ingredients?: string[];
  recipes: Recipe[];
}

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeMessage, setRecipeMessage] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chatbot State
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotPrompt, setChatbotPrompt] = useState<string | undefined>(undefined);

  const location = useLocation();

  useEffect(() => {
    fetchPurchases();
    handleGetRecipes();
    if (location.search.includes('openAi=true')) {
      setIsChatbotOpen(true);
    }
  }, [location.search]);

  const fetchPurchases = async () => {
    setLoadingPurchases(true);
    setError(null);
    try {
      const res = await client.get('/customers/me/purchases/');
      if (Array.isArray(res.data)) {
        setPurchases(res.data);
      } else {
        setPurchases(res.data.purchases || []);
        if (res.data.customer_name) {
          setCustomerName(res.data.customer_name);
        }
      }
    } catch (err: any) {
      console.error('Failed to load purchases', err);
      setError('Unable to load purchase history.');
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleGetRecipes = async () => {
    setLoadingRecipes(true);
    setRecipeMessage(null);
    setError(null);

    try {
      const res = await client.post('/chatbot/recipe-suggestions/', {});
      const data: RecipeSuggestionResponse = res.data;
      setRecipes(data.recipes || []);
      setRecipeMessage(data.message || data.detail || null);
    } catch (err: any) {
      setError('Unable to fetch AI recipe suggestions at the moment.');
    } finally {
      setLoadingRecipes(false);
    }
  };

  const openChatWithPrompt = (prompt: string) => {
    setChatbotPrompt(prompt);
    setIsChatbotOpen(true);
  };

  const isNearExpiry = (expDateStr: string) => {
    const exp = new Date(expDateStr);
    const today = new Date();
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Collect unique purchased product names
  const customerIngredients = Array.from(
    new Set(
      purchases.flatMap((p) => p.items.map((i) => i.product_name))
    )
  );

  const displayName = customerName || user?.name || user?.phone_number || user?.username;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Customer Personal Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome, {displayName}
            </h1>
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={() => {
                setChatbotPrompt(undefined);
                setIsChatbotOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold rounded-2xl transition shadow-lg text-sm"
            >
              <Bot className="w-5 h-5 text-emerald-600" />
              <span>Chat with Chef Smarty AI</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Suggestion Box & AI Chatbot Hero Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Bot className="w-6 h-6 text-emerald-600" />
              <h2>Interactive Recipe Chatbot & Suggestion Box</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Have a cooking question or need recipe ideas? Chat with <strong>Chef Smarty 👨‍🍳</strong> in real-time, get step-by-step instructions, or click any prompt below!
          </p>

          {/* Suggestion Box Prompt Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <button
              onClick={() => openChatWithPrompt("What can I cook with my purchased items?")}
              className="p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-2xl text-left transition space-y-1 group shadow-sm"
            >
              <div className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4" />
                <span>My Pantry Recipes</span>
              </div>
              <div className="text-xs text-slate-700 font-medium group-hover:text-emerald-900 transition">
                "What can I cook with my purchased items?"
              </div>
            </button>

            <button
              onClick={() => openChatWithPrompt("Give me a 15-minute quick dinner recipe")}
              className="p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-2xl text-left transition space-y-1 group shadow-sm"
            >
              <div className="text-xs font-black text-teal-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>15-Minute Meals</span>
              </div>
              <div className="text-xs text-slate-700 font-medium group-hover:text-emerald-900 transition">
                "Give me a 15-minute quick dinner recipe"
              </div>
            </button>

            <button
              onClick={() => openChatWithPrompt("Healthy breakfast ideas with my ingredients")}
              className="p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-2xl text-left transition space-y-1 group shadow-sm"
            >
              <div className="text-xs font-black text-amber-700 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                <span>Healthy Breakfast</span>
              </div>
              <div className="text-xs text-slate-700 font-medium group-hover:text-emerald-900 transition">
                "Healthy breakfast ideas with my ingredients"
              </div>
            </button>

            <button
              onClick={() => openChatWithPrompt("How do I store fresh food longer to prevent expiry?")}
              className="p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-2xl text-left transition space-y-1 group shadow-sm"
            >
              <div className="text-xs font-black text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Freshness Tips</span>
              </div>
              <div className="text-xs text-slate-700 font-medium group-hover:text-emerald-900 transition">
                "How to store fresh food longer to prevent expiry?"
              </div>
            </button>
          </div>
        </div>

        {/* AI Recipe Suggestions Cards */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-lg font-black text-slate-900">
              <ChefHat className="w-6 h-6 text-emerald-600" />
              <h2>AI Recipe Suggestions for Your Near-Expiry Items</h2>
            </div>

            <button
              onClick={handleGetRecipes}
              disabled={loadingRecipes}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl border border-emerald-200 text-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 ${loadingRecipes ? 'animate-spin' : ''}`} />
              <span>{loadingRecipes ? 'Generating AI Recipes...' : 'Refresh AI Suggestions'}</span>
            </button>
          </div>

          {loadingRecipes ? (
            <div className="p-8 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-bold text-slate-500">Groq AI is crafting personalized recipes based on your purchased items...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
              <p className="text-xs text-slate-600 font-bold">
                {recipeMessage || 'Click "Refresh AI Suggestions" above to generate custom AI recipes for your items!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-emerald-400 transition shadow-sm">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-emerald-700 leading-snug">{recipe.title}</h3>

                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ingredients Used</div>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.ingredients_used.map((ing, i) => (
                          <span key={i} className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Step-by-Step Instructions</div>
                      <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 leading-relaxed font-medium">
                        {recipe.steps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <button
                    onClick={() => openChatWithPrompt(`How do I cook ${recipe.title}? Give me detailed chef tips.`)}
                    className="w-full mt-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-slate-200 hover:border-emerald-300 flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Ask Chef Smarty about this recipe</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase History Section */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span>Your Purchase History ({purchases.length})</span>
            </h2>
            <button onClick={fetchPurchases} className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="p-6">
            {loadingPurchases ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <span>Loading your purchases...</span>
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm font-medium">
                No past purchases found on your account.
              </div>
            ) : (
              <div className="space-y-6">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <span className="font-extrabold text-slate-900 text-base">Purchase #{purchase.id}</span>
                        <span className="text-xs font-medium text-slate-500 ml-3">
                          {new Date(purchase.created_at).toLocaleDateString()} at {new Date(purchase.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-mono text-emerald-700 font-black text-lg">
                        Total: ₹{purchase.total_amount}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchased Items</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {purchase.items.map((item) => {
                          const nearExp = isNearExpiry(item.expiry_date);
                          return (
                            <div
                              key={item.id}
                              className={`p-4 rounded-xl border flex justify-between items-center ${
                                nearExp ? 'bg-rose-50/80 border-rose-200' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-slate-900 text-sm">
                                  {item.quantity}x {item.product_name}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                                  Expires on: <span className="font-bold text-slate-800">{item.expiry_date}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-mono font-black text-slate-900 text-sm">₹{item.line_total}</div>
                                {nearExp && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded mt-1 border border-rose-200">
                                    <AlertCircle className="w-3 h-3" />
                                    Expiring Soon
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating & Embedded Interactive AIChatbot Modal */}
      <AIChatbotModal
        isOpen={isChatbotOpen}
        onOpen={() => setIsChatbotOpen(true)}
        onClose={() => {
          setIsChatbotOpen(false);
          setChatbotPrompt(undefined);
        }}
        initialPrompt={chatbotPrompt}
        customerIngredients={customerIngredients}
      />
    </div>
  );
};

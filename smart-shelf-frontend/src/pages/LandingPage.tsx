import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  ChefHat,
  MessageSquare,
  CheckCircle2,
  UserCheck,
  TrendingUp,
  Bot,
  BellRing,
  Receipt
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div className="min-h-screen bg-emerald-50/40 text-slate-900 font-sans selection:bg-emerald-600 selection:text-white relative overflow-x-hidden">
      {/* Top Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 z-50 origin-left"
        style={{ scaleX }}
      />

      {/* HERO SECTION — CUSTOMER FOCUSED */}
      <section className="bg-gradient-to-b from-emerald-100/80 via-emerald-50/90 to-emerald-50/40 border-b border-emerald-200/60 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Ambient Mint Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[450px] h-[450px] bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Hero Content Left */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-emerald-300/80 text-emerald-800 text-xs font-extrabold shadow-xs">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>AI-Integrated Food Expiry & Smart Shelf Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Track store purchases, <br />
              <span className="text-emerald-700">
                zero food waste.
              </span>
            </h1>

            <p className="text-slate-700 text-base sm:text-lg max-w-xl font-medium leading-relaxed">
              Smart Shelf connects store QR billing with your personal customer portal — automatically tracking your purchased items, sending WhatsApp expiry reminders, and giving you instant AI recipe ideas!
            </p>

            {/* Customer Sign In Button */}
            <div className="pt-2">
              <Link
                to="/login/customer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base transition shadow-lg shadow-emerald-600/20 transform hover:-translate-y-0.5"
              >
                <UserCheck className="w-5 h-5" />
                <span>Customer Sign In</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Feature Highlights Strip */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-emerald-200/60 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">WhatsApp Reminders</div>
                  <div className="text-[11px] text-slate-600">7-Day Expiry Alerts</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Chef Smarty AI</div>
                  <div className="text-[11px] text-slate-600">Groq Recipe Ideas</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Digital Bills</div>
                  <div className="text-[11px] text-slate-600">Instant Phone Receipts</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Visual Card Right */}
          <div className="lg:col-span-5 relative">
            <div className="bg-white border border-emerald-200/80 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Customer Portal Preview</h3>
                    <p className="text-xs text-emerald-700 font-bold">Personal Grocery & Expiry Tracker</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-mono text-xs font-bold rounded-lg border border-emerald-200">
                  ACTIVE
                </span>
              </div>

              {/* Sample Purchased Items Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-200 pb-2 font-bold">
                  <span>Your Purchased Items</span>
                  <span className="text-emerald-700 font-mono">2 Items</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-white border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-900">1x French Fries 1kg</div>
                      <div className="text-[10px] text-slate-500">Expires: 2026-10-23</div>
                    </div>
                    <span className="font-mono text-emerald-700 font-black">₹250.00</span>
                  </div>

                  <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-rose-50 border border-rose-200">
                    <div>
                      <div className="font-bold text-slate-900">1x Organic Milk 1L</div>
                      <div className="text-[10px] text-rose-600 font-bold">⏰ Expiring Soon!</div>
                    </div>
                    <span className="font-mono text-emerald-700 font-black">₹30.00</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp Expiry Alert Sent</span>
                  </div>
                </div>
              </div>

              {/* AI Recipe Prompt Shortcut Card */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <ChefHat className="w-6 h-6 text-emerald-700 shrink-0" />
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Chef Smarty AI</h4>
                    <p className="text-[11px] text-emerald-900 font-medium">Chat with AI chef about recipes for your items!</p>
                  </div>
                </div>
                <Link
                  to="/login/customer"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shrink-0 transition shadow-xs"
                >
                  Open Chat
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Simple 3-Step Process</div>
          <h2 className="text-3xl font-black text-slate-900">How Smart Shelf Works</h2>
          <p className="text-sm text-slate-600">
            From in-store checkout to your home kitchen — keeping your food fresh and waste-free.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white border border-emerald-200/80 p-8 rounded-3xl space-y-4 shadow-sm relative hover:border-emerald-400 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-lg flex items-center justify-center border border-emerald-200">
              1
            </div>
            <h3 className="text-lg font-black text-slate-900">Shop In Store & QR Checkout</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Purchase items at your local store. The staff member scans product QR codes and enters your phone number at checkout.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-emerald-200/80 p-8 rounded-3xl space-y-4 shadow-sm relative hover:border-emerald-400 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-lg flex items-center justify-center border border-emerald-200">
              2
            </div>
            <h3 className="text-lg font-black text-slate-900">Receive WhatsApp Bill & Expiry Alerts</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Get an instant paperless WhatsApp receipt on your phone. Automatic WhatsApp alerts notify you 7 days before your food expires.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-emerald-200/80 p-8 rounded-3xl space-y-4 shadow-sm relative hover:border-emerald-400 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-lg flex items-center justify-center border border-emerald-200">
              3
            </div>
            <h3 className="text-lg font-black text-slate-900">View Items & Chat with Chef Smarty AI</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Log in to your Customer Portal anytime to track your purchased items, view expiry dates, and chat with <strong>Chef Smarty AI</strong> for custom recipes!
            </p>
          </div>
        </div>
      </section>

      {/* PLATFORM FEATURES SHOWCASE */}
      <section className="py-16 bg-white border-t border-b border-emerald-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Smart Features</div>
            <h2 className="text-3xl font-black text-slate-900">Built for Customers & Smart Kitchens</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-emerald-50/50 border border-emerald-200 p-6 rounded-3xl space-y-4 hover:border-emerald-400 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Groq AI Recipe Chatbot</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Ask <strong>Chef Smarty 👨‍🍳</strong> anything! Generates delicious recipes, cooking steps, and tips tailored specifically to the items you purchased.
              </p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200 p-6 rounded-3xl space-y-4 hover:border-emerald-400 transition">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Automated WhatsApp Receipts</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Digital receipts and 7-day expiry warnings delivered directly to customer WhatsApp accounts without manual effort.
              </p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200 p-6 rounded-3xl space-y-4 hover:border-emerald-400 transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Predictive Expiry Alerts</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Never throw away forgotten food again! Get automatic alerts when items in your kitchen inventory are approaching expiry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-slate-800 pb-8 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
              SS
            </div>
            <div>
              <div className="font-extrabold text-white text-sm">Smart Shelf Platform</div>
              <div>© 2026 Smart Shelf Inc. All Rights Reserved.</div>
            </div>
          </div>

          <div className="flex gap-6 font-bold">
            <Link to="/login/customer" className="hover:text-emerald-400 transition">Customer Portal Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

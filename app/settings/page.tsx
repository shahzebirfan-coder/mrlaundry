"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Save, Trash2, RotateCcw, Sun, Moon, Store, Phone, MapPin, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Loader2, Database, Upload } from "lucide-react";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { syncService } from "@/lib/sync-service";
import { DataImport } from "@/components/settings/data-import";

export default function SettingsPage() {
  const {
    theme, setTheme, shopName, shopTagline, shopPhone, shopWhatsapp, shopAddress, currency, updateSettings,
    resetToDemoData, clearAllData, pullFromCloud, pushToCloud, cloudEnabled, setCloudEnabled,
    syncStatus, lastSyncAt, syncError,
  } = usePOSStore();

  const [form, setForm] = useState({ shopName, shopTagline, shopPhone, shopWhatsapp, shopAddress, currency });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showSupabaseSetup, setShowSupabaseSetup] = useState(false);

  const configured = isSupabaseConfigured();

  function save() {
    updateSettings(form);
    alert("✅ Settings saved!");
  }

  async function testCloud() {
    setTesting(true);
    setTestResult(null);
    const result = await syncService.testConnection();
    setTestResult(result);
    setTesting(false);
  }

  async function syncNow() {
    if (!configured) {
      alert("⚠️ Please configure Supabase first. See setup guide below.");
      return;
    }
    await pushToCloud();
  }

  async function pullNow() {
    if (!configured) {
      alert("⚠️ Please configure Supabase first.");
      return;
    }
    if (confirm("⚠️ This will REPLACE your local data with cloud data. Continue?")) {
      await pullFromCloud();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-slate-700" /> Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure your shop, theme, cloud sync, and data
        </p>
      </div>

      {/* Shop Info */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2"><Store className="w-4 h-4" /> Shop Information</CardTitle>
            <CardSubtitle>Basic details about your business</CardSubtitle>
          </div>
        </CardHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Shop Name</label>
              <input className="input mt-1" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold">Tag Line</label>
              <input className="input mt-1" value={form.shopTagline} onChange={(e) => setForm({ ...form, shopTagline: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold">📞 Mobile</label>
              <input className="input mt-1" value={form.shopPhone} onChange={(e) => setForm({ ...form, shopPhone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold">📱 WhatsApp</label>
              <input className="input mt-1" value={form.shopWhatsapp} onChange={(e) => setForm({ ...form, shopWhatsapp: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold">Currency</label>
              <input className="input mt-1" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} maxLength={3} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold">📍 Address</label>
            <input className="input mt-1" value={form.shopAddress} onChange={(e) => setForm({ ...form, shopAddress: e.target.value })} />
          </div>
          <button onClick={save} className="btn-primary"><Save className="w-4 h-4" /> Save Settings</button>
        </div>
      </Card>

      {/* Cloud Sync — THE BIG ONE */}
      <Card className="border-2 border-primary-200 dark:border-primary-800">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              {configured ? <Cloud className="w-5 h-5 text-primary-600" /> : <CloudOff className="w-5 h-5 text-amber-500" />}
              Cloud Sync (Supabase)
            </CardTitle>
            <CardSubtitle>
              {configured ? "✅ Connected — data syncs automatically" : "⚠️ Not configured — using local only"}
            </CardSubtitle>
          </div>
          <span className={`badge ${configured ? "badge-success" : "badge-warning"}`}>
            {configured ? "Active" : "Setup Needed"}
          </span>
        </CardHeader>

        {/* Sync Status */}
        <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">SYNC STATUS</p>
              <div className="flex items-center gap-2 mt-1">
                {syncStatus === "syncing" && <Loader2 className="w-4 h-4 animate-spin text-primary-500" />}
                {syncStatus === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {syncStatus === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                {syncStatus === "offline" && <CloudOff className="w-4 h-4 text-amber-500" />}
                {syncStatus === "idle" && <Database className="w-4 h-4 text-slate-400" />}
                <p className="font-semibold capitalize">{syncStatus}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">LAST SYNC</p>
              <p className="text-sm font-semibold">
                {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
              </p>
            </div>
          </div>
          {syncError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20">
              ⚠️ {syncError}
            </p>
          )}
        </div>

        {/* Toggle & Actions */}
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={cloudEnabled}
              onChange={(e) => setCloudEnabled(e.target.checked)}
              disabled={!configured}
              className="w-5 h-5 rounded"
            />
            <div>
              <p className="font-semibold text-sm">Enable Cloud Sync</p>
              <p className="text-xs text-slate-500">Auto-sync changes to Supabase</p>
            </div>
          </label>
          <div className="flex gap-2">
            <button onClick={testCloud} disabled={testing || !configured} className="btn-secondary text-xs">
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Test
            </button>
            <button onClick={syncNow} disabled={!configured} className="btn-secondary text-xs">
              <RefreshCw className="w-3 h-3" /> Push Now
            </button>
            <button onClick={pullNow} disabled={!configured} className="btn-secondary text-xs">
              <Cloud className="w-3 h-3" /> Pull Now
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl text-sm mb-3 ${
            testResult.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
          }`}>
            {testResult.ok ? "✅ " : "❌ "}{testResult.message}
          </div>
        )}

        {/* Supabase Setup Guide */}
        {!configured && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">Setup Required</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Cloud sync is not configured. Your data is saved locally only.
                  Follow the 5-minute setup guide below to enable automatic cloud sync.
                </p>
                <button
                  onClick={() => setShowSupabaseSetup(!showSupabaseSetup)}
                  className="btn-secondary mt-3 text-xs"
                >
                  {showSupabaseSetup ? "Hide" : "Show"} Setup Guide
                </button>
              </div>
            </div>

            {showSupabaseSetup && (
              <div className="mt-4 p-4 rounded-lg bg-white dark:bg-slate-900 text-xs space-y-3">
                <p className="font-bold text-sm">📋 5-Minute Setup Guide</p>
                <ol className="space-y-3 list-decimal pl-5">
                  <li>
                    <strong>Create free Supabase account:</strong> Visit{" "}
                    <a href="https://supabase.com" target="_blank" className="text-primary-600 underline">supabase.com</a> and sign up (no credit card needed).
                  </li>
                  <li>
                    <strong>Create new project:</strong> Click "New Project", choose any name, set a database password.
                  </li>
                  <li>
                    <strong>Run SQL schema:</strong> Go to <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">SQL Editor</code> in Supabase dashboard.
                    Copy the entire <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">supabase/schema.sql</code> file content from this project, paste it there, and click <strong>Run</strong>.
                  </li>
                  <li>
                    <strong>Get credentials:</strong> Go to <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">Project Settings → API</code>.
                    Copy the <strong>Project URL</strong> and <strong>anon public key</strong>.
                  </li>
                  <li>
                    <strong>Add to Vercel:</strong> In your Vercel project dashboard, go to <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">Settings → Environment Variables</code> and add:
                    <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">
                      <p>NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co</p>
                      <p>NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6...</p>
                    </div>
                  </li>
                  <li>
                    <strong>Redeploy:</strong> Trigger a new deployment in Vercel (or just push a small change to GitHub). After redeploy, refresh this page and test the connection.
                  </li>
                </ol>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 mt-3">
                  <p className="text-emerald-700 dark:text-emerald-300">
                    ✨ <strong>That's it!</strong> After setup, every change you make will auto-sync to the cloud within 2 seconds. No more manual push/merge!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {configured && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  ✅ Cloud Sync Active!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  Your data is automatically syncing to Supabase. Every change is saved locally first (instant), then pushed to cloud within 2 seconds.
                  Works across all your devices — no manual push/merge needed!
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">🎨 Appearance</CardTitle>
            <CardSubtitle>Choose your theme</CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === "light" ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <Sun className="w-8 h-8 mx-auto text-amber-500" />
            <p className="font-semibold mt-2">Light Mode</p>
            <p className="text-xs text-slate-500">Bright & clean</p>
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === "dark" ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <Moon className="w-8 h-8 mx-auto text-indigo-500" />
            <p className="font-semibold mt-2">Dark Mode</p>
            <p className="text-xs text-slate-500">Easy on eyes</p>
          </button>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>💾 Data Management</CardTitle>
            <CardSubtitle>All data is saved locally + {configured ? "cloud" : "browser only"}</CardSubtitle>
          </div>
        </CardHeader>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {configured ? "✅ Hybrid: Local + Cloud" : "✅ Offline-First Storage"}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {configured
                ? "Your POS works offline (localStorage) AND online (Supabase). Both stay in sync automatically."
                : "Your POS works without internet. All data is saved in browser localStorage and persists across sessions."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { if (confirm("Reset to demo data?")) resetToDemoData(); }} className="btn-secondary">
              <RotateCcw className="w-4 h-4" /> Reset to Demo Data
            </button>
            <button onClick={() => { if (confirm("Clear ALL data? This cannot be undone!")) clearAllData(); }} className="btn-secondary !text-red-600 !border-red-300 hover:!bg-red-50">
              <Trash2 className="w-4 h-4" /> Clear All Data
            </button>
          </div>
        </div>
      </Card>

      {/* 🔥 NEW: Data Import / Export */}
      <Card className="border-2 border-primary-200 dark:border-primary-800">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" /> Import Old POS Data
            </CardTitle>
            <CardSubtitle>Upload backup from your previous POS — invoices continue from last number!</CardSubtitle>
          </div>
        </CardHeader>
        <DataImport />
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>ℹ️ About</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">App</span><span className="font-semibold">SparkleWash Laundry POS</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Version</span><span className="font-semibold">1.1.0</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Storage</span><span className="font-semibold">{configured ? "Local + Cloud" : "Local Only"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Framework</span><span className="font-semibold">Next.js 14</span></div>
          <div className="flex justify-between"><span className="text-slate-500">License</span><span className="font-semibold text-emerald-600">MIT (Free)</span></div>
        </div>
      </Card>
    </div>
  );
}

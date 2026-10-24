"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  Mail,
  User,
  Shield,
  Database,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const hasConfig = isSupabaseConfigured();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUserEmail(session?.user?.email ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      });

      return () => subscription.unsubscribe();
    }
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              business_name: businessName || "My Enterprise",
            },
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: data.session ? "Account created successfully!" : "Verification email sent. Check inbox.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: "success", text: "Signed in successfully!" });
        setTimeout(() => onClose(), 1000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUserEmail(null);
      setMessage({ type: "success", text: "Signed out successfully." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign out failed";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userEmail ? "Account & Cloud Sync" : isSignUp ? "Create COINCISE Account" : "Sign In to COINCISE"}
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Supabase Connection State Banner */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            hasConfig
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className={`w-4 h-4 ${hasConfig ? "text-emerald-600" : "text-blue-600"}`} />
            <div>
              <p className="font-bold">
                {hasConfig ? "Supabase PostgreSQL Active" : "Prototype Offline Demo Mode"}
              </p>
              <p className="text-[11px] opacity-80">
                {hasConfig
                  ? "Real-time cloud database connected with Row Level Security."
                  : "Using browser localStorage with fictional demo dataset."}
              </p>
            </div>
          </div>
          <Badge variant={hasConfig ? "success" : "neutral"} className="shrink-0 text-[10px]">
            {hasConfig ? "Cloud" : "Demo"}
          </Badge>
        </div>

        {/* User Session Info if Logged In */}
        {userEmail ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-slate-500">Authenticated User</p>
                <p className="text-sm font-bold text-slate-900 font-mono">{userEmail}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={loading}
                className="text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        ) : !hasConfig ? (
          /* Informative prompt when running offline without .env.local */
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              COINCISE is currently operating in <strong>Zero-Config Demo Mode</strong>. All additions, partial receipts, forecast calculations, and dispute cases are persisted locally in your browser storage.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
              <p className="font-bold text-slate-700 font-sans">To connect persistent Supabase:</p>
              <p className="text-slate-500">1. Copy <span className="text-blue-600">.env.example</span> to <span className="text-blue-600">.env.local</span></p>
              <p className="text-slate-500">2. Set your Supabase URL & Anon Key</p>
              <p className="text-slate-500">3. Apply migration: <span className="text-blue-600">supabase/migrations/...</span></p>
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={onClose}>
                Continue in Demo Mode
              </Button>
            </div>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Legal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Apex Engineering Works"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                placeholder="founder@enterprise.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {message && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 mt-1"
            >
              {loading ? "Processing..." : isSignUp ? "Create Account & Business Profile" : "Sign In with Supabase"}
            </Button>

            <div className="pt-2 text-center text-xs text-slate-500">
              {isSignUp ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setMessage(null);
                  }}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Already have an account? Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setMessage(null);
                  }}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Need an account? Sign up
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

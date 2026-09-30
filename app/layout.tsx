import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExpenseFlow — Personal Finance Platform",
  description: "Private personal finance and analytical ledger",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-emerald-700">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">₹</span>
                <span>ExpenseFlow</span>
              </Link>
              {user && (
                <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
                  <Link
                    href="/dashboard"
                    className="text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/bills"
                    className="text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    Bills
                  </Link>
                  <Link
                    href="/profile"
                    className="text-slate-600 hover:text-emerald-600 transition-colors"
                  >
                    Profile
                  </Link>
                </nav>
              )}
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 hidden sm:inline-block">
                    {user.email}
                  </span>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 transition-colors"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-xs font-semibold px-3 py-1.5 rounded-md text-slate-700 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ExpenseFlow. Private, isolated financial engineering platform.</p>
        </footer>
      </body>
    </html>
  );
}

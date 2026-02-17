import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import ThemeProvider, { useTheme } from "@/components/shared/ThemeProvider";
import {
  Home, Search, Bell, User, Settings, Plus, Moon, Sun,
  LogOut, Menu, X, MessageSquare, Users
} from "lucide-react";
import Avatar from "@/components/shared/Avatar";

function LayoutInner({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Ensure profile exists
      base44.entities.Profile.filter({ email: u.email }).then(profiles => {
        if (profiles[0]) {
          setProfile(profiles[0]);
        } else {
          base44.entities.Profile.create({
            email: u.email,
            full_name: u.full_name,
            username: u.email.split("@")[0],
            bio: "",
            profile_image: "",
            cover_image: "",
            badges: [],
          }).then(setProfile);
        }
      });
    }).catch(() => {});
  }, []);

  const isLandingPage = currentPageName === "Landing";

  const navItems = [
    { icon: Home, label: "Home", page: "Home" },
    { icon: Search, label: "Explore", page: "Explore" },
    { icon: Users, label: "Discover", page: "FollowSuggestions" },
    { icon: MessageSquare, label: "Messages", page: "Messages" },
    { icon: Bell, label: "Notifications", page: "Notifications" },
  ];

  // Landing page has different layout
  if (isLandingPage) {
    return (
      <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
        <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--convs-sidebar) 85%, transparent)", borderColor: "var(--convs-border)" }}>
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992f6acbe5cb4f8025521fe/a8787b74f_Convs_Logo-removebg-preview.png" alt="Convs" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold tracking-tight" style={{ color: "var(--convs-text)" }}>
                Convs
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl transition-colors hover:bg-[var(--convs-bg-tertiary)]"
                style={{ color: "var(--convs-text-muted)" }}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Home"))}
                className="px-4 py-1.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "#6366F1", color: "#FFFFFF" }}
              >
                Sign In
              </button>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--convs-sidebar) 85%, transparent)", borderColor: "var(--convs-border)" }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to={createPageUrl("Home")} className="flex items-center gap-2.5">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992f6acbe5cb4f8025521fe/a8787b74f_Convs_Logo-removebg-preview.png" alt="Convs" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--convs-text)" }}>
              Convs
            </span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 flex-wrap">
              {navItems.map(item => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page) + (item.params || "")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "text-[var(--convs-accent)] bg-[var(--convs-accent-light)]"
                        : "text-[var(--convs-text-secondary)] hover:text-[var(--convs-text)] hover:bg-[var(--convs-bg-tertiary)]"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-colors hover:bg-[var(--convs-bg-tertiary)]"
              style={{ color: "var(--convs-text-muted)" }}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <Link to={createPageUrl("Profile") + `?email=${user.email}`}>
                  <Avatar name={user.full_name} image={profile?.profile_image} size="sm" />
                </Link>
                <button
                  onClick={() => base44.auth.logout(createPageUrl("Landing"))}
                  className="hidden md:block p-2 rounded-xl transition-colors hover:bg-[var(--convs-bg-tertiary)]"
                  style={{ color: "var(--convs-text-muted)" }}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="px-4 py-1.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "#6366F1", color: "#FFFFFF" }}
              >
                Sign In
              </button>
            )}

            {/* Mobile menu button */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl"
                style={{ color: "var(--convs-text-muted)" }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && user && (
          <div className="md:hidden border-t px-4 py-3 space-y-1" style={{ borderColor: "var(--convs-border)" }}>
            {navItems.map(item => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page) + (item.params || "")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "text-[var(--convs-accent)] bg-[var(--convs-accent-light)]"
                      : "text-[var(--convs-text-secondary)]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Bar */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--convs-sidebar) 85%, transparent)", borderColor: "var(--convs-border)" }}>
          {navItems.map(item => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page) + (item.params || "")}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all ${
                  isActive ? "text-[var(--convs-accent)]" : "text-[var(--convs-text-muted)]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => base44.auth.logout(createPageUrl("Landing"))}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-[var(--convs-text-muted)] transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </nav>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ThemeProvider>
      <LayoutInner currentPageName={currentPageName}>
        {children}
      </LayoutInner>
    </ThemeProvider>
  );
}
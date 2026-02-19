import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users, FileText, BarChart3, Shield, Trash2, Eye, Ban,
  CheckCircle, Loader2, ArrowLeft, Search, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Avatar from "@/components/shared/Avatar";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminContent from "@/components/admin/AdminContent";
import AdminReports from "@/components/admin/AdminReports";
import moment from "moment";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
    enabled: !!user && user.role === "admin",
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: () => base44.entities.Profile.list("-created_date", 200),
    enabled: !!user && user.role === "admin",
  });

  const { data: allConvs = [] } = useQuery({
    queryKey: ["admin-convs"],
    queryFn: () => base44.entities.Conv.list("-created_date", 200),
    enabled: !!user && user.role === "admin",
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ["admin-comments"],
    queryFn: () => base44.entities.Comment.list("-created_date", 200),
    enabled: !!user && user.role === "admin",
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-[var(--convs-text-muted)]" />
        <h1 className="text-xl font-bold text-[var(--convs-text)] mb-2">Access Denied</h1>
        <p className="text-[var(--convs-text-muted)]">You need admin privileges to access this page.</p>
        <Link to={createPageUrl("Home")}>
          <Button className="mt-4 bg-[var(--convs-accent)] text-white">Go Home</Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users },
    { key: "content", label: "Content", icon: FileText },
    { key: "reports", label: "Reports", icon: Shield },
  ];

  const moderatedConvs = allConvs.filter(c => c.status === "moderated");
  const todayConvs = allConvs.filter(c => moment(c.created_date).isSame(moment(), "day"));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[var(--convs-bg-tertiary)]">
            <ArrowLeft className="w-5 h-5 text-[var(--convs-text-muted)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--convs-text)]">Admin Dashboard</h1>
            <p className="text-sm text-[var(--convs-text-muted)]">Manage users, content & analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--convs-accent-light)]">
          <Shield className="w-3.5 h-3.5 text-[var(--convs-accent)]" />
          <span className="text-xs font-semibold text-[var(--convs-accent)]">Admin</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Users", value: allUsers.length, icon: Users, color: "text-blue-500" },
          { label: "Total Convs", value: allConvs.length, icon: FileText, color: "text-emerald-500" },
          { label: "Today's Convs", value: todayConvs.length, icon: TrendingUp, color: "text-purple-500" },
          { label: "Moderated", value: moderatedConvs.length, icon: Shield, color: "text-amber-500" },
        ].map(stat => (
          <div key={stat.label} className="convs-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-[var(--convs-text-muted)] uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--convs-text)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--convs-border)] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
              activeTab === tab.key
                ? "text-[var(--convs-accent)]"
                : "text-[var(--convs-text-muted)] hover:text-[var(--convs-text-secondary)]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--convs-accent)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <AdminAnalytics users={allUsers} convs={allConvs} comments={allComments} />
      )}
      {activeTab === "users" && <AdminUsers users={allUsers} profiles={allProfiles} />}
      {activeTab === "content" && <AdminContent convs={allConvs} comments={allComments} />}
      {activeTab === "reports" && <AdminReports />}
    </div>
  );
}
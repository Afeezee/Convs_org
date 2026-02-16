import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Shield, ShieldOff, Trash2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/shared/Avatar";
import moment from "moment";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminUsers({ users }) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const filtered = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleToggle = async (user) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    await base44.entities.User.update(user.id, { role: newRole });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.full_name || user.email}?`)) return;
    await base44.entities.User.delete(user.id);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--convs-text-muted)]" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-9 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]"
        />
      </div>

      <div className="convs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--convs-border)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--convs-text-muted)] uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--convs-text-muted)] uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--convs-text-muted)] uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--convs-text-muted)] uppercase tracking-wider hidden md:table-cell">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--convs-text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-[var(--convs-border)] last:border-0 hover:bg-[var(--convs-bg-secondary)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.full_name} image={u.profile_image} size="sm" />
                      <span className="font-medium text-[var(--convs-text)]">{u.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--convs-text-secondary)] hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-[var(--convs-accent-light)] text-[var(--convs-accent)]"
                        : "bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-secondary)]"
                    }`}>
                      {u.role === "admin" && <Shield className="w-3 h-3" />}
                      {u.role || "user"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--convs-text-muted)] text-xs hidden md:table-cell">
                    {moment(u.created_date).format("MMM D, YYYY")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={createPageUrl("Profile") + `?email=${u.email}`}>
                        <button className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-muted)] hover:text-[var(--convs-text)]">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleRoleToggle(u)}
                        className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-muted)] hover:text-[var(--convs-accent)]"
                        title={u.role === "admin" ? "Remove admin" : "Make admin"}
                      >
                        {u.role === "admin" ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--convs-text-muted)] hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--convs-text-muted)]">No users found</div>
        )}
      </div>
    </div>
  );
}
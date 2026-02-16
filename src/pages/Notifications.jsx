import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bell, Check, Loader2, UserPlus, MessageSquare, ThumbsUp, ThumbsDown, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/shared/Avatar";
import moment from "moment";

const ICONS = {
  follow: UserPlus,
  comment: MessageSquare,
  support: ThumbsUp,
  oppose: ThumbsDown,
  mention: AtSign,
  flaw_tag: ThumbsDown,
  highlight_reply: MessageSquare,
};

const COLORS = {
  follow: "text-[var(--convs-accent)] bg-[var(--convs-accent-light)]",
  comment: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  support: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  oppose: "text-red-500 bg-red-50 dark:bg-red-950/30",
  mention: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
  flaw_tag: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
  highlight_reply: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30",
};

export default function Notifications() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--convs-text)]">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--convs-text-muted)]">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5 text-[var(--convs-accent)]">
            <Check className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-10 h-10 mx-auto mb-3 text-[var(--convs-text-muted)] opacity-40" />
          <p className="text-sm text-[var(--convs-text-muted)]">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const Icon = ICONS[n.type] || Bell;
            const colorClass = COLORS[n.type] || COLORS.comment;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                className={`flex items-start gap-3 p-4 rounded-xl transition-colors cursor-pointer ${
                  n.is_read
                    ? "opacity-60"
                    : "bg-[var(--convs-card)] hover:bg-[var(--convs-card-hover)] shadow-sm"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--convs-text)]">
                    {n.from_name && <span className="font-semibold">{n.from_name} </span>}
                    {n.message}
                  </p>
                  <p className="text-xs text-[var(--convs-text-muted)] mt-0.5">{moment(n.created_date).fromNow()}</p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[var(--convs-accent)] flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
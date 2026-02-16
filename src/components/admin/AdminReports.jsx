import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Flag, CheckCircle, XCircle, Ban, Eye, Loader2 } from "lucide-react";
import Avatar from "@/components/shared/Avatar";
import moment from "moment";

const REASON_LABELS = {
  hate_speech: "Hate Speech",
  harassment: "Harassment",
  misinformation: "Misinformation",
  spam: "Spam",
  inappropriate: "Inappropriate",
  other: "Other",
};

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  dismissed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  action_taken: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

export default function AdminReports() {
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => base44.entities.Report.list("-created_date", 200),
  });

  const filteredReports = filter === "all"
    ? reports
    : reports.filter(r => r.status === filter);

  // Group by date
  const groupedByDate = {};
  filteredReports.forEach(r => {
    const date = moment(r.created_date).format("YYYY-MM-DD");
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(r);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

  const handleStatus = async (report, status) => {
    await base44.entities.Report.update(report.id, { status });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const handleModerateConv = async (report) => {
    await base44.entities.Conv.update(report.conv_id, { status: "moderated" });
    await base44.entities.Report.update(report.id, { status: "action_taken" });
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    queryClient.invalidateQueries({ queryKey: ["admin-convs"] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--convs-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["all", "pending", "reviewed", "dismissed", "action_taken"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all border ${
              filter === s
                ? "bg-[var(--convs-accent-light)] text-[var(--convs-accent)] border-[var(--convs-accent)]"
                : "bg-[var(--convs-bg-secondary)] text-[var(--convs-text-secondary)] border-transparent hover:border-[var(--convs-border)]"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: reports.length, color: "text-[var(--convs-accent)]" },
          { label: "Pending", value: reports.filter(r => r.status === "pending").length, color: "text-amber-500" },
          { label: "Action Taken", value: reports.filter(r => r.status === "action_taken").length, color: "text-red-500" },
          { label: "Dismissed", value: reports.filter(r => r.status === "dismissed").length, color: "text-gray-500" },
        ].map(s => (
          <div key={s.label} className="convs-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--convs-text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Reports grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="convs-card p-8 text-center text-sm text-[var(--convs-text-muted)]">
          No reports found
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-[var(--convs-text-secondary)] mb-2 mt-4">
              {moment(date).format("dddd, MMMM D, YYYY")}
              <span className="ml-2 text-xs text-[var(--convs-text-muted)]">
                ({groupedByDate[date].length} report{groupedByDate[date].length > 1 ? "s" : ""})
              </span>
            </h3>
            <div className="space-y-2">
              {groupedByDate[date].map(report => (
                <div key={report.id} className="convs-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                      <Flag className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-[var(--convs-text)]">
                          {report.reporter_name || report.reporter_email}
                        </span>
                        <span className="text-xs text-[var(--convs-text-muted)]">reported</span>
                        <span className="text-sm font-medium text-[var(--convs-text)]">
                          {report.conv_author_name || "a conv"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[report.status] || STATUS_STYLES.pending}`}>
                          {report.status?.replace("_", " ")}
                        </span>
                        <span className="text-xs text-[var(--convs-text-muted)] ml-auto">
                          {moment(report.created_date).format("h:mm A")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                          {REASON_LABELS[report.reason] || report.reason}
                        </span>
                      </div>

                      {report.conv_title && (
                        <p className="text-sm text-[var(--convs-text-secondary)] line-clamp-2 mb-1">
                          "{report.conv_title}"
                        </p>
                      )}

                      {report.details && (
                        <p className="text-xs text-[var(--convs-text-muted)] italic mb-2">
                          "{report.details}"
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-2">
                        <Link to={createPageUrl("ConvDetail") + `?id=${report.conv_id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-muted)]" title="View Conv">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        {report.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleModerateConv(report)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--convs-text-muted)] hover:text-red-500"
                              title="Moderate Post"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStatus(report, "reviewed")}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-[var(--convs-text-muted)] hover:text-blue-500"
                              title="Mark Reviewed"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStatus(report, "dismissed")}
                              className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-[var(--convs-text-muted)] hover:text-gray-500"
                              title="Dismiss"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
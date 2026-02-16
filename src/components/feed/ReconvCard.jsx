import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Repeat2 } from "lucide-react";
import Avatar from "../shared/Avatar";
import ConvCard from "./ConvCard";
import moment from "moment";

export default function ReconvCard({ reconv, originalConv, onSupport, onOppose, onBookmark, isBookmarked, onShare, onReconv }) {
  if (!originalConv) return null;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 px-5 pt-3 text-xs" style={{ color: "var(--convs-text-muted)" }}>
        <Repeat2 className="w-3.5 h-3.5" />
        <Link
          to={createPageUrl("Profile") + `?email=${reconv.user_email}`}
          className="font-semibold hover:underline"
          style={{ color: "var(--convs-text-secondary)" }}
        >
          {reconv.user_name}
        </Link>
        <span>reconved · {moment(reconv.created_date).fromNow()}</span>
      </div>
      {reconv.thought && (
        <p className="px-5 pt-2 text-sm" style={{ color: "var(--convs-text)" }}>
          {reconv.thought}
        </p>
      )}
      <div className="px-2 pt-1">
        <ConvCard
          conv={originalConv}
          onSupport={onSupport}
          onOppose={onOppose}
          onBookmark={onBookmark}
          isBookmarked={isBookmarked}
          onShare={onShare}
          onReconv={onReconv}
        />
      </div>
    </div>
  );
}
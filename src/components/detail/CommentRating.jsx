import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Star } from "lucide-react";

export default function CommentRating({ commentId, currentUserEmail }) {
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.entities.CommentRating.filter({ comment_id: commentId }).then(ratings => {
      setTotalRatings(ratings.length);
      if (ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
      if (currentUserEmail) {
        const mine = ratings.find(r => r.user_email === currentUserEmail);
        if (mine) setUserRating(mine.rating);
      }
    }).catch(() => {});
  }, [commentId, currentUserEmail]);

  const handleRate = async (rating) => {
    if (!currentUserEmail || isSubmitting) return;
    setIsSubmitting(true);

    const existing = await api.entities.CommentRating.filter({ comment_id: commentId, user_email: currentUserEmail });
    if (existing[0]) {
      await api.entities.CommentRating.update(existing[0].id, { rating });
    } else {
      await api.entities.CommentRating.create({ comment_id: commentId, rating });
    }

    setUserRating(rating);

    // Recalculate average
    const allRatings = await api.entities.CommentRating.filter({ comment_id: commentId });
    setTotalRatings(allRatings.length);
    if (allRatings.length > 0) {
      const avg = allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / allRatings.length;
      setAvgRating(Math.round(avg * 10) / 10);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => {
          const filled = hoveredStar ? star <= hoveredStar : star <= userRating;
          return (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              disabled={!currentUserEmail || isSubmitting}
              className="p-0 disabled:cursor-default transition-transform hover:scale-110"
            >
              <Star
                className={`w-3.5 h-3.5 transition-colors ${
                  filled
                    ? "text-amber-400 fill-amber-400"
                    : "text-[var(--convs-text-muted)]"
                }`}
              />
            </button>
          );
        })}
      </div>
      {totalRatings > 0 && (
        <span className="text-[10px] text-[var(--convs-text-muted)]">
          {avgRating} ({totalRatings})
        </span>
      )}
    </div>
  );
}
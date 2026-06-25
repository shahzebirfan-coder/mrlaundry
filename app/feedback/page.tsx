"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Star, ThumbsUp, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function FeedbackPage() {
  const { feedback } = usePOSStore();
  const avgRating = feedback.length ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : "0";

  const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({
    rating: `${r}★`,
    count: feedback.filter((f) => f.rating === r).length,
  }));

  const ratingColors = ["#10b981", "#34d399", "#f59e0b", "#f97316", "#ef4444"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Star className="w-7 h-7 text-amber-500" /> Customer Feedback
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ratings, reviews, and service quality metrics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-slate-500">Average Rating</p>
          <p className="text-3xl font-bold mt-1 flex items-center gap-2">
            {avgRating} <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Total Reviews</p>
          <p className="text-3xl font-bold mt-1">{feedback.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">5-Star Reviews</p>
          <p className="text-3xl font-bold mt-1 text-emerald-600">{feedback.filter(f => f.rating === 5).length}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Response Rate</p>
          <p className="text-3xl font-bold mt-1 text-primary-600">85%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>⭐ Rating Distribution</CardTitle>
              <CardSubtitle>How customers rate us</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis type="category" dataKey="rating" stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "none", borderRadius: "12px", color: "#fff" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {ratingDistribution.map((_, i) => <Cell key={i} fill={ratingColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>💬 Recent Reviews</CardTitle>
              <CardSubtitle>Latest customer feedback</CardSubtitle>
            </div>
          </CardHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {feedback.map((f) => (
              <div key={f.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">{f.customerName}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < f.rating ? "text-amber-500 fill-amber-500" : "text-slate-300"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{f.comment || "Great service!"}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                  <span>Service: {f.serviceRating}★</span>
                  <span>Delivery: {f.deliveryRating}★</span>
                  <span>Staff: {f.staffRating}★</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

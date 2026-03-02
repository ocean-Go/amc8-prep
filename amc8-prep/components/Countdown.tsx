"use client";

import { useState, useEffect } from "react";

export default function Countdown() {
  const [days, setDays] = useState(0);
  
  useEffect(() => {
    const target = new Date("2027-01-23");
    const now = new Date();
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    setDays(diff);
  }, []);

  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-6 py-3 rounded-full">
        <span className="text-2xl">⏰</span>
        <span className="text-white font-semibold">
          距离2027年1月23日 AMC8 竞赛还有
        </span>
        <span className="text-3xl font-bold text-yellow-300">{days}</span>
        <span className="text-white font-semibold">天</span>
      </div>
    </div>
  );
}

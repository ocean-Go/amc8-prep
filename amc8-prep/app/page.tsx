"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Countdown from "@/components/Countdown";

export default function Home() {
  const [users, setUsers] = useState([
    { id: "1", name: "matt", displayName: "Matt", age: 11, totalScore: 0 },
    { id: "2", name: "chris", displayName: "Chris", age: 9, totalScore: 0 },
  ]);
  const [currentUser, setCurrentUserState] = useState("matt");

  useEffect(() => {
    const saved = localStorage.getItem("amc8_current_user") || "matt";
    setCurrentUserState(saved);
  }, []);

  const handleSelectUser = (name: string) => {
    localStorage.setItem("amc8_current_user", name);
    setCurrentUserState(name);
  };

  const matt = users.find((u) => u.name === "matt");
  const chris = users.find((u) => u.name === "chris");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 animate-gradient-xy"></div>
      
      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-24 h-24 bg-white/10 rounded-full animate-pulse delay-700"></div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            🧮 AMC8 备考系统
          </h1>
          <p className="text-xl text-white/90">为 Matt 和 Chris 准备的竞赛备考系统</p>
        </div>

        {/* Countdown */}
        <Countdown />

        {/* User Cards */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mt-8">
          {/* Matt's Card */}
          <Link href="/dashboard" className="block">
            <div 
              onClick={() => handleSelectUser("matt")}
              className={`card hover:scale-105 transition-all duration-300 cursor-pointer ${
                currentUser === "matt" ? "ring-4 ring-blue-500 shadow-2xl" : "shadow-lg"
              }`}
            >
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">👦</div>
                <h2 className="text-2xl font-bold text-gray-800">{matt?.displayName}</h2>
                <p className="text-gray-600 mt-2">{matt?.age} 岁</p>
                <div className="mt-4 inline-block bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-semibold">
                  上次得分: 9/25
                </div>
                <p className="text-sm text-gray-500 mt-2">已有基础，继续提升！📈</p>
              </div>
            </div>
          </Link>

          {/* Chris's Card */}
          <Link href="/dashboard" className="block">
            <div 
              onClick={() => handleSelectUser("chris")}
              className={`card hover:scale-105 transition-all duration-300 cursor-pointer ${
                currentUser === "chris" ? "ring-4 ring-green-500 shadow-2xl" : "shadow-lg"
              }`}
            >
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">👶</div>
                <h2 className="text-2xl font-bold text-gray-800">{chris?.displayName}</h2>
                <p className="text-gray-600 mt-2">{chris?.age} 岁</p>
                <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-1 rounded-full text-sm font-semibold">
                  初次备考
                </div>
                <p className="text-sm text-gray-500 mt-2">从零开始，潜力无限！🌟</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center text-white/60 text-sm">
          © 2026 AMC8 Prep System | Made with ❤️
        </div>
      </div>
    </main>
  );
}

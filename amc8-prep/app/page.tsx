"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { initLocalDB, getCurrentUser, setCurrentUser, User } from "@/lib/db-local";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUserState] = useState<string>("");

  useEffect(() => {
    initLocalDB();
    const allUsers = [
      { id: "1", name: "matt", displayName: "Matt", age: 11, totalScore: 0 },
      { id: "2", name: "chris", displayName: "Chris", age: 9, totalScore: 0 },
    ];
    setUsers(allUsers);
    const saved = localStorage.getItem("amc8_current_user") || "matt";
    setCurrentUserState(saved);
  }, []);

  const handleSelectUser = (name: string) => {
    setCurrentUser(name);
    setCurrentUserState(name);
  };

  const matt = users.find((u) => u.name === "matt");
  const chris = users.find((u) => u.name === "chris");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">🧮 AMC8 备考系统</h1>
        <p className="text-xl text-white/80">为 Matt 和 Chris 准备的竞赛备考系统</p>
        <p className="text-white/60 mt-2">距离 2027年1月23日竞赛还有约 10 个月</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Matt's Card */}
        <Link href="/dashboard" className="block">
          <div 
            onClick={() => handleSelectUser("matt")}
            className={`card hover:scale-105 transition-transform cursor-pointer ${
              currentUser === "matt" ? "ring-4 ring-blue-500" : ""
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">👦</div>
              <h2 className="text-2xl font-bold text-gray-800">{matt?.displayName}</h2>
              <p className="text-gray-600 mt-2">{matt?.age} 岁</p>
              <div className="mt-4 inline-block bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm">
                上次得分: 9/25
              </div>
              <p className="text-sm text-gray-500 mt-2">已有基础，继续提升！</p>
            </div>
          </div>
        </Link>

        {/* Chris's Card */}
        <Link href="/dashboard" className="block">
          <div 
            onClick={() => handleSelectUser("chris")}
            className={`card hover:scale-105 transition-transform cursor-pointer ${
              currentUser === "chris" ? "ring-4 ring-green-500" : ""
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">👶</div>
              <h2 className="text-2xl font-bold text-gray-800">{chris?.displayName}</h2>
              <p className="text-gray-600 mt-2">{chris?.age} 岁</p>
              <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-1 rounded-full text-sm">
                初次备考
              </div>
              <p className="text-sm text-gray-500 mt-2">从零开始，潜力无限！</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-12 text-white/60 text-sm">
        © 2026 AMC8 Prep System | Made with ❤️
      </div>
    </main>
  );
}

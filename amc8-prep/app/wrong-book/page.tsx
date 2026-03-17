import Link from "next/link";

import WrongBookReviewPanel from "@/components/wrong-book/review-panel";

export default function WrongBookPage() {
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">📕 Wrong Book Review</h1>
          <Link href="/dashboard" className="text-white hover:underline">
            ← Back
          </Link>
        </div>

        <WrongBookReviewPanel />
      </div>
    </main>
  );
}

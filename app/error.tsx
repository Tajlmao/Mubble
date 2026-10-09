"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="boot-screen">
      <img src="/mubble-mark.svg" alt="" width="48" height="48" />
      <span>Mubble</span>
      <p>Something interrupted your view of Earth.</p>
      <button className="primary-button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

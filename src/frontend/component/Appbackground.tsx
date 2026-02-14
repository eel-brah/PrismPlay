import React from "react";

export default function AppBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen text-white overflow-hidden">

      <div className="absolute inset-0 bg-[#0f101f]" />

      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full 
        bg-purple-600/20 blur-[140px]" />

      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full 
        bg-blue-600/20 blur-[140px]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,80,255,0.12),transparent_60%)]" />

      <div className="absolute inset-0 opacity-[0.06] 
        [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)]
        [background-size:60px_60px]" />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

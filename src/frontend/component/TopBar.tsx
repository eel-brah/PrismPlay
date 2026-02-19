import React from "react";

type Section =
  | "home"
  | "games"
  | "leaderboard"
  | "social"
  | "profile";

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-2 py-1 transition-colors
${active ? "text-white" : "text-gray-400 hover:text-gray-200"}
after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
after:scale-x-0 after:bg-gradient-to-r after:from-purple-400 after:to-blue-400
after:transition-transform
${active ? "after:scale-x-100" : "hover:after:scale-x-100"}
`}
    >
      {label}
    </button>
  );
}

type TopBarProps = {
  show?: boolean;
  isAuthed: boolean;
  isHome?: boolean;
  activeSection?: Section;
  navigate: (path: string) => void;
  onLogout: () => void;
  onReturn?: () => void;
};

const TopBar: React.FC<TopBarProps> = ({
  show = true,
  isAuthed,
  isHome,
  activeSection,
  navigate,
  onLogout,
  onReturn,
}) => {
  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      <div className="relative backdrop-blur-2xl bg-[#0f101f]/55 shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />

        <div className="mx-auto max-w-6xl px-4">
          <div className="h-14 flex items-center justify-between text-sm">
            {/* Left */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate("/home")}
                className="font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 hover:from-blue-200 hover:to-purple-200 transition-colors"
              >
                PrismPlay
              </button>

              <div className="flex items-center gap-5">
                <NavItem label="Home" active={activeSection === "home"} onClick={() => navigate("/home")} />
                <NavItem label="Games" active={activeSection === "games"} onClick={() => navigate("/games")} />

                {isAuthed && (
                  <>
                    <NavItem label="Leaderboard" active={activeSection === "leaderboard"} onClick={() => navigate("/leaderboard")} />
                    <NavItem label="Social" active={activeSection === "social"} onClick={() => navigate("/social")} />
                    <NavItem label="Profile" active={activeSection === "profile"} onClick={() => navigate("/profile")} />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAuthed ? (
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-md bg-gradient-to-r from-red-500/20 to-red-500/15 border border-red-400/30 text-red-300 hover:text-red-200 hover:border-red-400/60 transition-all"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={() => navigate("/login/form")}
                  className="px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-500/20 to-purple-500/10 border border-blue-400/30 text-blue-200 hover:text-white hover:border-purple-400/60 transition-all"
                >
                  Login
                </button>
              )}

              {!isHome && (
                <button
                  onClick={onReturn}
                  className="px-3 py-1.5 rounded-md border border-white/15 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;


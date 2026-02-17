import { useEffect, useRef, useState } from "react";
import { connectPresence, disconnectPresence } from "./presenceSocket";
import { connectChat, disconnectChat } from "./chatSocket";
import { type Socket } from "socket.io-client";
import Pong from "./component/pong/pong";
import LoginForm from "./component/LoginForm";
import RegisterForm from "./component/RegisterForm";
import HomePage from "./component/HomePage";
import SocialHub from "./component/SocialHub";
import GamePage from "./component/GamePage";
import ErrorPage from "./component/ErrorPage";
import axios from "axios";
import PlayerProfile, { PublicPlayerProfile } from "./component/PlayerProfile";
import {
  Route,
  Routes,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Agario from "./component/Agario";
import OnlinePong from "./component/pong/OnlinePong/OnlinePong";
import {
  apiGetMe,
  apiLogin,
  apiLogout,
  apiRegister,
  getStoredToken,
  storeToken,
  clearToken,
  // apiPingMe,
  // TOKEN_KEY,
} from "./api";
import AppBackground from "./component/Appbackground";
import GlobalLeaderboard from "./component/GlobalLeaderboard";
import GameInviteOverlay from "./component/GameInviteOverlay";

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
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  // const [sessionMode, setSessionMode] = useState<"guest" | "user">("guest");
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [bootingAuth, setBootingAuth] = useState(true);
  const [user, setUser] = useState<{
    id: number;
    username: string;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);

  //CHECK TOKEN IF VALID
  const presenceRef = useRef<Socket | null>(null);
  const isAuthed = !bootingAuth && !!token;

  function saveProfileDataForPlayerProfile(user: {
    username: string;
    email: string;
    avatarUrl?: string | null;
  }) {
    const raw = localStorage.getItem("profile_data");
    let previous: any = {};
    try {
      previous = raw ? JSON.parse(raw) : {};
    } catch {}

    const next = {
      ...previous,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? previous.avatarUrl ?? "",
    };

    localStorage.setItem("profile_data", JSON.stringify(next));
  }

  // useEffect(() => {
  //   if (!token) return;

  //   const ping = async () => {
  //     try {
  //       await apiPingMe(token);
  //     } catch {}
  //   };

  //   ping();

  //   const id = window.setInterval(ping, 15_000);

  //   const onVisibility = () => {
  //     if (document.visibilityState === "visible") ping();
  //   };
  //   window.addEventListener("focus", ping);
  //   document.addEventListener("visibilitychange", onVisibility);

  //   return () => {
  //     window.clearInterval(id);
  //     window.removeEventListener("focus", ping);
  //     document.removeEventListener("visibilitychange", onVisibility);
  //   };
  // }, [token]);

  useEffect(() => {
    //     async function boot() {
    //         const saved = getStoredToken();

    //         if (!saved) {
    //             setBootingAuth(false);
    //             return;
    //         }

    //         try {
    //             const me = await apiGetMe(saved);
    //             setToken(saved);
    //             setUser(me); // Store user data
    //             saveProfileDataForPlayerProfile(me);
    //         } catch (e: any) {
    //             // token expired/invalid
    //             const status = axios.isAxiosError(e) ? e.response?.status : undefined;
    //             if (status === 401 || status === 403) {
    //                 clearToken();
    //                 setToken(null);
    //                 setUser(null);
    //             }
    //             // clearToken();
    //             // setToken(null);
    //             // console.log("has been caled ", e);

    //             // setSessionMode("guest");
    //         } finally {
    //             setBootingAuth(false);
    //         }
    //     }

    //     boot();
    // }, []);
    async function boot() {
      // ── Handle OAuth redirect token ──
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get("token");
      if (oauthToken) {
        storeToken(oauthToken);
        window.history.replaceState({}, "", window.location.pathname);
      }

      const saved = getStoredToken();

      if (!saved) {
        setBootingAuth(false);
        return;
      }

      try {
        const me = await apiGetMe(saved);
        setToken(saved);
        setUser(me);
        saveProfileDataForPlayerProfile(me);
      } catch (e: any) {
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        if (status === 401 || status === 403) {
          clearToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        setBootingAuth(false);
      }
    }

    boot();
  }, []);
  useEffect(() => {
    if (bootingAuth) return;

    if (!token) {
      disconnectPresence();
      disconnectChat();
      return;
    }

    const ps = connectPresence(token);

    ps.on("connect", () => console.log("presence connected from App", ps.id));
    ps.on("disconnect", () => console.log("presence disconnected from App"));

    // Connect global chat socket (needs user id)
    if (user?.id) {
      connectChat(user.id);
    }

    return () => {
      ps.off("connect");
      ps.off("disconnect");
    };
  }, [bootingAuth, token, user]);
  async function handleLogin(email: string, password: string) {
    const data = await apiLogin(email, password);

    storeToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
    // setSessionMode("user");
    saveProfileDataForPlayerProfile(data.user);

    navigate("/home");
  }

  async function handleRegister(
    username: string,
    email: string,
    password: string,
  ) {
    await apiRegister(username, email, password);
    await handleLogin(email, password); // auto login
  }

  async function handleLogout() {
    const current = token ?? getStoredToken();

    if (current) {
      try {
        await apiLogout(current);
      } catch {}
    }

    clearToken();
    setToken(null);
    setUser(null);
    disconnectChat();
    // setSessionMode("guest");
    navigate("/home");
  }

  const hideTopBar =
    location.pathname === "/agario" ||
    location.pathname === "/offline" ||
    location.pathname === "/online" ||
    location.pathname.startsWith("/game/");
  const showTopBar = !hideTopBar;
  const topPaddingClass = showTopBar ? "pt-16" : "";
  const minimalTopBar =
    location.pathname === "/offline" || location.pathname === "/online";
  const activeSection =
    location.pathname === "/home"
      ? "home"
      : location.pathname === "/leaderboard"
        ? "leaderboard"
        : location.pathname === "/games" ||
            location.pathname === "/landing" ||
            location.pathname === "/guest" ||
            location.pathname === "/offline" ||
            location.pathname === "/online" ||
            location.pathname === "/agario"
          ? "games"
          : location.pathname.startsWith("/social")
            ? "social"
            : location.pathname.startsWith("/profile")
              ? "profile"
              : "none";
  const isHome = location.pathname === "/home";
  const isGame = location.pathname === "/games";
  const returnLabel = isHome ? (isAuthed ? "Log Out" : "Log In") : "Return";

  const handleReturnClick = () => {
    if (isHome) {
      if (isAuthed) {
        void handleLogout();
      } else {
        navigate("/login/form");
      }
      return;
    }
    handleReturn();
  };

  const handleReturn = () => {
    if (globalThis.history.length > 1) {
      if (
        location.pathname.startsWith("/login") ||
        location.pathname === "/register"
      ) {
        navigate("/home", { replace: true });
        return;
      }
      navigate(-1);
      return;
    }
    navigate("/games");
  };

  return (
    <>
      <AppBackground>
        {showTopBar && (
          <div className="fixed top-0 left-0 right-0 z-[100]">
            <div
              className="
        relative
        backdrop-blur-2xl
        bg-[#0f101f]/55
        shadow-[0_8px_40px_rgba(0,0,0,0.45)]
      "
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />

              <div className="mx-auto max-w-6xl px-4">
                <div className="h-14 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => navigate("/home")}
                      className="
                font-semibold tracking-wide text-transparent bg-clip-text
                bg-gradient-to-r from-blue-300 to-purple-300
                hover:from-blue-200 hover:to-purple-200 transition-colors
              "
                    >
                      Ping Pong
                    </button>

                    {!minimalTopBar && (
                      <div className="flex items-center gap-5">
                        <NavItem
                          label="Home"
                          active={activeSection === "home"}
                          onClick={() => navigate("/home")}
                        />
                        <NavItem
                          label="Games"
                          active={activeSection === "games"}
                          onClick={() => navigate("/games")}
                        />

                        {isAuthed && (
                          <>
                            <NavItem
                              label="Leaderboard"
                              active={activeSection === "leaderboard"}
                              onClick={() => navigate("/leaderboard")}
                            />
                            <NavItem
                              label="Social"
                              active={activeSection === "social"}
                              onClick={() => navigate("/social")}
                            />
                            <NavItem
                              label="Profile"
                              active={activeSection === "profile"}
                              onClick={() => navigate("/profile")}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isAuthed ? (
                      <button
                        onClick={handleLogout}
                        className="
                  px-3 py-1.5 rounded-md
                  bg-gradient-to-r from-red-500/20 to-red-500/15
                  border border-red-400/30
                  text-red-300 hover:text-red-200
                  hover:border-red-400/60
                  transition-all
                "
                      >
                        Logout
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate("/login/form")}
                        className="
                  px-3 py-1.5 rounded-md
                  bg-gradient-to-r from-blue-500/20 to-purple-500/10
                  border border-blue-400/30
                  text-blue-200 hover:text-white
                  hover:border-purple-400/60
                  transition-all
                "
                      >
                        Login
                      </button>
                    )}

                    {!isHome && (
                      <button
                        onClick={handleReturn}
                        className="
                  px-3 py-1.5 rounded-md
                  border border-white/15
                  text-gray-300 hover:text-white
                  hover:bg-white/10
                  transition-all
                "
                      >
                        Back
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAuthed && <GameInviteOverlay />}

        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route
            path="/home"
            element={
              <div
                className={`${topPaddingClass} flex items-center justify-center`}
              >
                <HomePage
                  onPlay={() => navigate("/games")}
                  onLogin={() => navigate("/login/form")}
                  onRegester={() => navigate("/register")}
                  loggedIn={isAuthed}
                  onPong={() => navigate("/landing")}
                  onAgar={() => navigate("/agario")}
                  onSocial={() => navigate("/social")}
                />
              </div>
            }
          />
          <Route
            path="/agario"
            element={
              <div
                className={`${topPaddingClass} min-h-screen overflow-y-auto`}
              >
                <Agario />
              </div>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <div className={`min-h-screen ${topPaddingClass}`}>
                <GlobalLeaderboard />
              </div>
            }
          />
          <Route
            path="/login"
            element={<Navigate to="/login/form" replace />}
          />
          <Route
            path="/login/form"
            element={
              <div className="min-h-screen  flex items-center justify-center px-6">
                <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 items-center">
                  <div className="hidden md:block text-white">
                    <h1 className="text-4xl font-bold mb-4">Welcome Back</h1>
                    <p className="text-gray-300 leading-relaxed">
                      Log in to continue your progress, access multiplayer
                      matches, track your statistics and compete on the
                      leaderboard.
                    </p>

                    <div className="mt-8 text-sm text-gray-400">
                      New here?
                      <button
                        onClick={() => navigate("/register")}
                        className="ml-2 text-purple-400 hover:text-purple-300 underline"
                      >
                        Create an account
                      </button>
                    </div>
                  </div>

                  <div className="w-full max-w-md mx-auto">
                    <LoginForm
                      onSubmit={handleLogin}
                      onRegister={() => navigate("/register")}
                    />

                    <div className="md:hidden text-center mt-5 text-sm text-gray-400">
                      Don’t have an account?
                      <button
                        onClick={() => navigate("/register")}
                        className="ml-2 text-purple-400 hover:text-purple-300 underline"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
          />
          <Route
            path="/register"
            element={
              <div className="min-h-screen  flex items-center justify-center px-6">
                <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 items-center">
                  <div className="hidden md:block text-white">
                    <h1 className="text-4xl font-bold mb-4">
                      Create Your Account
                    </h1>
                    <p className="text-gray-300 leading-relaxed">
                      Save your progress, unlock multiplayer, appear on the
                      leaderboard and connect with other players.
                    </p>

                    <div className="mt-8 text-sm text-gray-400">
                      Already registered?
                      <button
                        onClick={() => navigate("/login/form")}
                        className="ml-2 text-blue-400 hover:text-blue-300 underline"
                      >
                        Login instead
                      </button>
                    </div>
                  </div>

                  <div className="w-full max-w-md mx-auto">
                    <RegisterForm onSubmit={handleRegister} />

                    <div className="md:hidden text-center mt-5 text-sm text-gray-400">
                      Already have an account?
                      <button
                        onClick={() => navigate("/login/form")}
                        className="ml-2 text-blue-400 hover:text-blue-300 underline"
                      >
                        Login
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
          />
          <Route
            path="/games"
            element={
              <div className={`min-h-screen  ${topPaddingClass}`}>
                <div className="max-w-5xl mx-auto px-6 py-14">
                  <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                      Game Launcher
                    </h1>

                    <p className="text-gray-300 mt-3 text-lg">
                      Select a game mode and start playing
                    </p>

                    {!isAuthed && (
                      <div className="mt-4 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 inline-block px-4 py-2 rounded-lg">
                        Guest mode: Online ranking and social features disabled
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button
                      onClick={() =>
                        navigate(!isAuthed ? "/guest" : "/landing")
                      }
                      className="group text-left rounded-3xl border bg-white/[0.04] border-white/10 hover:border-purple-400/40 backdrop-blur-xl p-7 shadow-xl hover:scale-[1.03] hover:border-purple-400/60 transition-all"
                    >
                      <div className="flex items-center gap-5 mb-5">
                        <div className="w-16 h-16 rounded-2xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-3xl group-hover:scale-110 transition">
                          🏓
                        </div>

                        <div>
                          <div className="text-2xl font-semibold text-purple-300">
                            Pong Arena
                          </div>
                          <div className="text-gray-400 text-sm">
                            Precision competitive paddle game
                          </div>
                        </div>
                      </div>

                      <ul className="text-sm text-gray-300 space-y-1 mb-6">
                        <li>• Offline practice vs AI</li>
                        <li>• Online matchmaking</li>
                        <li>• Player statistics tracking</li>
                        <li>• Skill-based rallies</li>
                      </ul>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {isAuthed ? "Multiplayer Enabled" : "Offline Only"}
                        </span>

                        <span className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold group-hover:bg-purple-500 transition">
                          Play
                        </span>
                      </div>
                    </button>

                    <Link
                      to="/agario"
                      className="group text-left rounded-3xl border bg-white/[0.04] border-white/10 hover:border-blue-400/40 backdrop-blur-xl p-7 shadow-xl hover:scale-[1.03] hover:border-blue-400/60 transition-all"
                    >
                      <div className="flex items-center gap-5 mb-5">
                        <div className="w-16 h-16 rounded-2xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-3xl group-hover:scale-110 transition">
                          🔵
                        </div>

                        <div>
                          <div className="text-2xl font-semibold text-blue-300">
                            Agar Arena
                          </div>
                          <div className="text-gray-400 text-sm">
                            Mass survival competition
                          </div>
                        </div>
                      </div>

                      <ul className="text-sm text-gray-300 space-y-1 mb-6">
                        <li>• Grow by consuming pellets</li>
                        <li>• Split and outplay opponents</li>
                        <li>• Global leaderboard ranking</li>
                        <li>• Survival strategy gameplay</li>
                      </ul>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {isAuthed ? "Full access" : "Play as a guest"}
                        </span>

                        <span className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold group-hover:bg-purple-500 transition">
                          Play
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            }
          />
          <Route
            path="/landing"
            element={
              isAuthed ? (
                <div className={`min-h-screen ${topPaddingClass}`}>
                  <div className="max-w-4xl mx-auto px-6 py-16">
                    <div className="text-center mb-14">
                      <div className="text-sm text-purple-300 mb-2 tracking-wide">
                        Pong Arena
                      </div>

                      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        Choose How You Play
                      </h1>

                      <p className="text-gray-300 mt-4 text-lg">
                        Practice against AI or compete against real players
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <button
                        onClick={() => navigate("/offline")}
                        className="group text-left rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-xl p-7 hover:border-blue-400/40 hover:scale-[1.02] transition-all"
                      >
                        <div className="flex items-center gap-4 mb-5">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center
                                bg-blue-500/10 border border-blue-400/40 text-2xl
                                group-hover:scale-110 transition"
                          >
                            🤖
                          </div>

                          <div>
                            <div className="text-2xl font-semibold text-blue-300">
                              Offline Mode
                            </div>
                            <div className="text-gray-400 text-sm">
                              Play offline against other players or AI
                            </div>
                          </div>
                        </div>

                        <ul className="text-sm text-gray-300 space-y-1 mb-6">
                          <li>• Play against players </li>
                          <li>• Train against AI opponent </li>
                          <li>• Adjustable difficulty</li>
                          <li>• No network required</li>
                        </ul>

                        <div className="flex justify-end">
                          <span
                            className="px-5 py-2 rounded-lg text-sm font-semibold
                                 bg-gradient-to-r from-blue-500 to-blue-600
                                 group-hover:from-blue-400 group-hover:to-blue-500 text-white/90 transition"
                          >
                            Play offline
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => navigate("/online")}
                        className="group text-left rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-xl p-7 hover:border-purple-400/40 hover:scale-[1.02] transition-all"
                      >
                        <div className="flex items-center gap-4 mb-5">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center
                                bg-purple-500/10 border border-purple-400/40 text-2xl
                                group-hover:scale-110 transition"
                          >
                            🌐
                          </div>

                          <div>
                            <div className="text-2xl font-semibold text-purple-300">
                              Online Match
                            </div>

                            <div className="text-gray-400 text-sm">
                              1v1 against random players
                            </div>
                          </div>
                        </div>

                        <ul className="text-sm text-gray-300 space-y-1 mb-6">
                          <li>• Online games</li>
                          <li>• Quick matchmaking</li>
                          <li>• Competitive ranking</li>
                          <li>• Real-time gameplay</li>
                        </ul>

                        <div className="flex justify-end">
                          <span
                            className="px-5 py-2 rounded-lg text-sm font-semibold
                                 bg-gradient-to-r from-purple-500 to-purple-600
                                 group-hover:from-purple-400 text-white/90 group-hover:to-purple-500 transition"
                          >
                            Find Match
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Navigate to="/guest" replace />
              )
            }
          />
          <Route
            path="/social"
            element={
              bootingAuth ? (
                <div className="min-h-screen flex items-center justify-center text-white">
                  Loading...
                </div>
              ) : isAuthed ? (
                <div
                  className={`relative h-screen overflow-hidden  ${topPaddingClass}`}
                >
                  <SocialHub />
                </div>
              ) : (
                <Navigate to="/login/form" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              bootingAuth ? (
                <div className="min-h-screen flex items-center justify-center text-white">
                  Loading...
                </div>
              ) : isAuthed ? (
                <div className={`min-h-screen ${topPaddingClass}`}>
                  <PlayerProfile />
                </div>
              ) : (
                <Navigate to="/login/form" replace />
              )
            }
          />
          <Route
            path="/profile/:username"
            element={
              bootingAuth ? (
                <div className="min-h-screen flex items-center justify-center text-white">
                  Loading...
                </div>
              ) : isAuthed ? (
                <div className={`min-h-screen ${topPaddingClass}`}>
                  <PublicPlayerProfile />
                </div>
              ) : (
                <Navigate to="/login/form" replace />
              )
            }
          />
          <Route
            path="/guest"
            element={
              <div
                className={`min-h-screen flex items-center justify-center ${topPaddingClass}`}
              >
                <div className="flex flex-col items-center justify-center p-8">
                  <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    Guest Mode
                  </h1>
                  <p className="text-gray-300 mb-8">
                    Only offline mode is available
                  </p>
                  <div className="grid grid-cols-1 gap-6 w-full max-w-3xl">
                    <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-gray-700">
                      <h2 className="text-xl font-semibold text-green-400 mb-2">
                        Offline Mode
                      </h2>
                      <p className="text-gray-300 mb-4">
                        Play against AI opponent
                      </p>
                      <ul className="text-sm text-gray-400 mb-6 space-y-1">
                        <li>• Practice your skills</li>
                        <li>• Adjustable AI difficulty</li>
                        <li>• No internet required</li>
                      </ul>
                      <button
                        onClick={() => navigate("/offline")}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                      >
                        Play Offline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
          />
          <Route
            path="/offline"
            element={
              <div className={`h-screen overflow-hidden ${topPaddingClass}`}>
                <div className="h-full min-h-0 flex items-center">
                  <Pong onReturn={handleReturn} />
                </div>
              </div>
            }
          />
          <Route
            path="/online"
            element={
              bootingAuth ? (
                <div className="min-h-screen flex items-center justify-center text-white">
                  Loading...
                </div>
              ) : isAuthed && user && token ? (
                <div
                  className={`min-h-screen flex items-center justify-center p-8 ${topPaddingClass}`}
                >
                  <OnlinePong token={token} onReturn={handleReturn} />
                </div>
              ) : (
                <Navigate to="/login/form" replace />
              )
            }
          />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route
            path="*"
            element={
              <ErrorPage
                code={404}
                title="Not Found"
                message="That page doesn't exist."
              />
            }
          />
        </Routes>
      </AppBackground>
    </>
  );
}

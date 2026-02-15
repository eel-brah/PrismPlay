import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { DEFAULT_ROOM, MAP_HEIGHT, MAP_WIDTH, MAX_MINUTES, MAX_PLAYERS_PER_ROOM, MIN_MINUTES, MIN_PLAYERS_PER_ROOM } from "@/../shared/agario/config";
import { Player } from "@/../shared/agario/player";
import {
  Eject,
  FinalLeaderboardEntry,
  FinalStatus,
  Mouse,
  Orb,
  PlayerData,
  RoomSummary,
  Virus,
} from "@/../shared/agario/types";
import { drawEjects, drawGrid, drawOrbs, drawPlayer, drawViruses, getOrCreateGuestId, randomPlayer } from "@/game/agario/utils";
import { FinalLeaderboard, Leaderboard } from "./agario/LeaderBoard";
import { FinalStatusOverlay } from "./agario/FinalStatusOverlay";
import { TopStatusBar } from "./agario/RoomStatusBar";
import { nanoid } from "nanoid"
import { TOKEN_KEY } from "@/api";
import { InputState } from "src/backend/modules/agario/agario_schema";
import { useNavigate } from "react-router-dom";
import { AlertType, Camera, LeaderboardEntry, LobbyPlayer, RoomInfo } from "@/game/agario/type";
import { isValidRoomName } from "../../shared/agario/utils";

const alertStyles: Record<Exclude<AlertType, "">, string> = {
  error: "bg-red-100 border-red-300 text-red-700",
  warning: "bg-yellow-100 border-yellow-300 text-yellow-800",
  info: "bg-blue-100 border-blue-300 text-blue-700",
};

const HOME_PAGE = "home"

const Agario = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const playerRef = useRef<Player | null>(null);
  const orbsRef = useRef<Orb[]>([]);
  const ejectsRef = useRef<Eject[]>([]);
  const virusesRef = useRef<Virus[]>([]);
  const cameraRef = useRef<Camera | null>(null);
  const mouseRef = useRef<Mouse>({ x: 0, y: 0 });
  const enemiesRef = useRef<Record<string, Player>>({});
  // const inputSeqRef = useRef(0);
  const isDeadRef = useRef(false);
  const isSpectatorRef = useRef(false);

  const [playerName, setPlayerName] = useState("");
  const [menuMode, setMenuMode] = useState(HOME_PAGE);
  const [roomName, setRoomName] = useState("");
  const roomNameRef = useRef<string>("");
  const [hasJoined, setHasJoined] = useState(false);
  const [firstTime, setFirstTime] = useState(true);

  const pendingInputsRef = useRef<InputState[]>([]);
  // const lastProcessedSeqRef = useRef<number>(0);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState<FinalLeaderboardEntry[]>([]);
  const [finalStatus, setFinalStatus] = useState<FinalStatus | null>(null);
  const isEmptyLeaderboard = useRef<boolean>(true);

  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  }>({ type: "", message: "" });

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [allowSpectators, setAllowSpectators] = useState(false);
  const [isSpectator, setSpectator] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState<number | "">("");
  const [durationMin, setDurationMin] = useState<number | "">("");
  const [joinKey, setJoinKey] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const roomStatusRef = useRef<"waiting" | "started" | "ended">("waiting");


  const navigate = useNavigate();

  const goHome = () => {
    navigate("/");
  };

  const goProfile = () => {
    navigate("/profile");
  };

  function clearAlert() {
    setTimeout(() => {
      setAlert({ type: "", message: "" });
    }, 3000);
  }

  useEffect(() => {
    const authToken = localStorage.getItem(TOKEN_KEY);
    const sessionId = nanoid();

    const socket = io("/agario", {
      path: "/socket.io",
      auth: {
        sessionId,
        token: authToken ?? undefined,
        guestId: authToken ? undefined : getOrCreateGuestId(),
      },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    resizeCanvas();

    function initCam() {
      if (!canvas || !playerRef.current) return;
      cameraRef.current = {
        x: playerRef.current.x - canvas.width / 2,
        y: playerRef.current.y - canvas.height / 2,
        width: canvas.width,
        height: canvas.height,
      };

      mouseRef.current = {
        x: canvas.width / 2,
        y: canvas.height / 2,
      };
    }

    socket.on("connect", () => {
      console.log("Connected to server with socket id:", socket.id);
    });

    socket.on("connect_error", (err) => {
      setAlert({ type: "error", message: err.message });
    });

    const interval = setInterval(() => {
      if (!hasJoined) socket.emit("agario:list-rooms");
    }, 1000);
    socket.emit("agario:list-rooms");

    socket.on("agario:error", (msg: string) => {
      setAlert({ type: "error", message: msg });
    });
    socket.on("agario:info", (msg: string) => {
      setAlert({ type: "info", message: msg });
    });
    socket.on("agario:warning", (msg: string) => {
      setAlert({ type: "warning", message: msg });
    });

    socket.on("agario:room-info", (info: RoomInfo) => {
      setRoomInfo(info);
      setLobbyPlayers(info.players);
      roomStatusRef.current = info.status;
    });

    socket.on("agario:room-players", (data: { players: LobbyPlayer[]; hostId: string; spectatorCount: number }) => {
      setLobbyPlayers(data.players);
      setRoomInfo((prev) => (prev ? { ...prev, players: data.players, hostId: data.hostId, spectatorCount: data.spectatorCount } : prev));
    });

    socket.on("agario:room-status", (data: { status: "waiting" | "started", startedAt: number | undefined }) => {
      setRoomInfo((prev) => (prev ? { ...prev, status: data.status, startedAt: data.startedAt } : prev));
      roomStatusRef.current = data.status;
      if (data.status === "started") clearAlert();
    });

    socket.on("agario:rooms", (list: RoomSummary[]) => {
      setRooms(list);
    });

    socket.on("agario:room-created", (data: { key?: string }) => {
      setCreatedKey(data.key ?? "");
    });

    socket.on("agario:room-ended", () => {
      clearing("leaderboard")
      setAlert({ type: "info", message: "Room ended" });
      roomStatusRef.current = "ended";
    });

    socket.on("agario:leaderboard", (leaderboard: FinalLeaderboardEntry[]) => {
      setFinalLeaderboard(leaderboard)
      isEmptyLeaderboard.current = leaderboard.length === 0;
    });
    // socket.on("leaderboard:final", setLeaderboard);

    socket.on("agario:left-room", () => {
      clearing(Object.keys(enemiesRef.current).length === 0
        && roomNameRef.current != DEFAULT_ROOM
        && !isEmptyLeaderboard.current
        ? "leaderboard" : HOME_PAGE);
    });

    socket.on("agario:final-status", (status: FinalStatus) => {
      setFinalStatus(status);
    })

    socket.on("joined", (data: PlayerData | null, spectator: boolean) => {
      if (spectator) {
        playerRef.current = randomPlayer();
        isSpectatorRef.current = true;
      } else if (data) {
        playerRef.current = Player.deserialize(data);
        console.log(
          "Joined game as",
          playerRef.current.id,
          " named: ",
          playerRef.current.name,
        );
        isSpectatorRef.current = false;
      }

      isDeadRef.current = false;
      setMenuMode(roomNameRef.current);
      setHasJoined(true);
      setFirstTime(false);
      clearAlert();

      enemiesRef.current = {};
      orbsRef.current = [];
      ejectsRef.current = [];
      virusesRef.current = [];
      pendingInputsRef.current = [];
      // lastProcessedSeqRef.current = data.lastProcessedSeq;

      initCam();
    });

    //TODO: prediction + reconciliation: remove?? 
    socket.on(
      "heartbeat",
      (data: { players: Record<string, PlayerData>; orbs: Orb[]; ejects: Eject[]; viruses: Virus[] }) => {
        const myId = socket.id;
        if (!myId) return;

        const myData = data.players[myId];
        if (myData) {
          if (!playerRef.current) {
            playerRef.current = Player.deserialize(myData);
          } else {
            playerRef.current.updateFromData(myData);
          }

          // lastProcessedSeqRef.current = myData.lastProcessedSeq;

          // const remainingInputs = pendingInputsRef.current.filter(
          //   (input) => input.seq > myData.lastProcessedSeq
          // );
          // pendingInputsRef.current = remainingInputs;

          // const player = playerRef.current;
          // const orbs = orbsRef.current;
          // const ejects = ejectsRef.current;
          // if (player) {
          // const viruses = virusesRef.current;
          //   for (const input of remainingInputs) {
          //     const mouse: Mouse = { x: input.mouseX, y: input.mouseY };
          //     //TODO: player.update(input.dt, mouse, orbs, [], false);
          //     const [eatenOrbs, eatenEjects] = player.update(input.dt, mouse, orbs, ejects, false);
          //     if (eatenOrbs.length > 0) {
          //       const eatenSet = new Set(eatenOrbs);
          //       orbsRef.current = orbsRef.current.filter(
          //         (o) => !eatenSet.has(o.id),
          //       );
          //     }
          //     if (eatenEjects.length > 0) {
          //       const eatenSet = new Set(eatenEjects);
          //       ejectsRef.current = ejectsRef.current.filter(
          //         (e) => !eatenSet.has(e.id),
          //       );
          //     }
          //   }
          // }
        }

        for (const [id, pData] of Object.entries(data.players)) {
          if (id === myId) continue;

          if (enemiesRef.current[id]) {
            enemiesRef.current[id].updateFromData(pData);
          } else {
            enemiesRef.current[id] = Player.deserialize(pData);
          }
        }

        const enemiesIds = new Set(Object.keys(data.players));
        for (const id of Object.keys(enemiesRef.current)) {
          if (!enemiesIds.has(id)) {
            delete enemiesRef.current[id];
          }
        }

        orbsRef.current = data.orbs;
        ejectsRef.current = data.ejects;
        virusesRef.current = data.viruses;

        const playersArray = Object.entries(data.players).map(([id, p]) => ({
          id,
          name: p.name,
          totalMass: p.totalMass,
          decayMultiplier: p.decayMultiplier,
        }));

        playersArray.sort((a, b) => b.totalMass - a.totalMass);

        const ranked = playersArray.map((p, index) => ({
          ...p,
          rank: index + 1,
          isMe: p.id === myId,
          decayMultiplier: p.decayMultiplier,
        }));

        const top10 = ranked.slice(0, 10);
        const me = ranked.find(p => p.id === myId);

        let finalBoard = top10;
        if (me && me.rank > 10) {
          finalBoard = [...top10, me];
        }
        setLeaderboard(finalBoard);
      },
    );

    socket.on("agario:backtomenu", () => {
      clearing()
    })

    socket.on("youLost", () => {
      isDeadRef.current = true;
      setMenuMode("game over");
    });

    function handleResize() {
      resizeCanvas();
      const cam = cameraRef.current;
      if (!cam || !canvas || !playerRef.current) return;

      cam.width = canvas.width;
      cam.height = canvas.height;
      cam.x = playerRef.current.x - cam.width / 2;
      cam.y = playerRef.current.y - cam.height / 2;
    }

    function handleMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (roomStatusRef.current !== "started") return;

      if (e.repeat) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        const sock = socketRef.current;
        if (!sock || isDeadRef.current) return;
        sock.emit("split");
      } else if (e.code === "KeyW" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        const sock = socketRef.current;
        if (!sock || isDeadRef.current) return;
        sock.emit("eject");
      }
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);

    function update(dt: number) {
      if (roomStatusRef.current !== "started") return;

      const player = playerRef.current;
      const camera = cameraRef.current;
      // const orbs = orbsRef.current;
      // const ejects = ejectsRef.current;
      // const viruses = virusesRef.current;

      if (!canvas || !player || !camera) return;

      const worldMouse: Mouse = {
        x: mouseRef.current.x + camera.x,
        y: mouseRef.current.y + camera.y,
      };

      // local prediction 
      // player.update(dt, worldMouse, [], [], isDeadRef.current);
      // const [eatenOrbs, eatenEjects] = player.update(dt, worldMouse, orbs, ejects, isDeadRef.current);
      // if (eatenOrbs.length > 0) {
      //   const eatenSet = new Set(eatenOrbs);
      //   orbsRef.current = orbsRef.current.filter(
      //     (o) => !eatenSet.has(o.id),
      //   );
      // }
      // if (eatenEjects.length > 0) {
      //   const eatenSet = new Set(eatenEjects);
      //   ejectsRef.current = ejectsRef.current.filter(
      //     (e) => !eatenSet.has(e.id),
      //   );
      // }

      if (isSpectatorRef.current || isDeadRef.current) player.update(dt, worldMouse, [], [], true);

      camera.x = player.x - camera.width / 2;
      camera.y = player.y - camera.height / 2;

      if (isSpectatorRef.current || isDeadRef.current) return;

      // inputSeqRef.current += 1;
      const input: InputState = {
        x: worldMouse.x,
        y: worldMouse.y,
        // seq: inputSeqRef.current,
        dt,
      };
      pendingInputsRef.current.push(input);
      socket.emit("input", input);
    }

    function draw() {
      if (!canvas || !ctx) return;
      const camera = cameraRef.current;
      const player = playerRef.current;
      if (!camera || !player) return;

      ctx.fillStyle = "#121212";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawGrid(ctx, camera);

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);

      drawOrbs(ctx, orbsRef.current, camera);
      drawEjects(ctx, ejectsRef.current, camera);
      drawPlayer(ctx, player, camera);
      for (const enemy of Object.values(enemiesRef.current))
        drawPlayer(ctx, enemy, camera);
      drawViruses(ctx, virusesRef.current, camera);
    }

    function gameLoop(now: number) {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = now;
      }
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      update(dt);
      draw();

      animationIdRef.current = requestAnimationFrame(gameLoop);
    }

    animationIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function handleJoinRoom(mode: "join" | "create", spectator = false) {
    const socket = socketRef.current;
    if (!socket) return;

    let name = playerName.trim();
    if (playerName.length > 6) name = playerName.slice(0, 6);
    name = name || "Pl" + Math.floor(Math.random() * 1000);
    setPlayerName(name);

    let room = roomNameRef.current.trim();

    if (room.length > 20) room = room.slice(0, 20);
    if (room.length === 0) room = DEFAULT_ROOM;
    setRoomName(room);
    roomNameRef.current = room;

    if (mode === "join") {
      socket.emit("agario:join-room", { name, room, key: joinKey.trim() || undefined, spectator });
    } else {
      console.log("olayerL: ", maxPlayers)
      socket.emit("agario:create-room", {
        name,
        room,
        visibility,
        players: maxPlayers,
        durationMin,
        allowSpectators
      });
    }
  }

  function handleRespawn() {
    const socket = socketRef.current;
    if (!socket) return;

    isDeadRef.current = false;
    setMenuMode(roomNameRef.current);

    let room = roomNameRef.current.trim();
    if (room.length === 0) room = DEFAULT_ROOM;
    socket.emit("agario:join-room", { name: playerName, room, key: joinKey.trim() || undefined });
  }

  function backToMainMenu(leave: boolean = false) {
    if (leave) leaveRoom();
    clearing();
  }

  function leaveRoom() {
    socketRef.current?.emit("agario:leave-room");
  }

  function clearing(mode = HOME_PAGE) {
    isDeadRef.current = false;

    setHasJoined(false);
    setRoomInfo(null);
    setLobbyPlayers([]);
    setLeaderboard([]);

    setMenuMode(mode);
    setRoomName("");
    roomNameRef.current = "";
    setJoinKey("");
    setCreatedKey("");
    clearAlert();
  }


  const glassPanel =
    "bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_60px_rgba(0,0,0,0.45)]";

  const glowCard =
    "bg-white/[0.04] border border-white/10 rounded-lg backdrop-blur-md";

  const dangerBtn =
    "px-5 py-3 rounded-lg font-semibold transition-all duration-200 " +
    "bg-red-500/20 border border-red-400/40 text-red-200 " +
    "hover:bg-red-500/30 hover:border-red-400/70";

  const badge =
    "px-2 py-0.5 text-xs rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200";
  const primaryBtn =
    "px-6 py-3 rounded-lg text-lg font-medium transition-all duration-200 " +
    "bg-white/[0.05] backdrop-blur-md border border-white/10 text-white " +
    "hover:bg-white/[0.08] hover:border-purple-400/40 hover:shadow-[0_0_10px_rgba(168,85,247,0.25)] active:scale-[0.97]";

  const accentBtn =
    "px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-200 " +
    "bg-purple-500/30 border border-purple-400/40 text-white " +
    "hover:from-purple-500/40 hover:to-blue-500/30 hover:shadow-[0_0_10px_rgba(168,85,247,0.45)] active:scale-[0.97]";

  const subtleBtn =
    "px-4 py-2 rounded-md text-lg transition-all duration-200 " +
    "bg-white/[0.04] border border-white/10 text-gray-200 " +
    "hover:bg-white/[0.07] hover:text-white hover:border-white/20";

  const listBtn =
    "px-3 py-2 rounded-md text-sm transition-all " +
    "bg-white/[0.05] border border-white/10 text-gray-200 " +
    "hover:bg-white/[0.1] hover:border-blue-400/40";

  return (
    <div className="fixed inset-0 text-zinc-100 overflow-hidden">

      <div className="absolute inset-0 -z-50 bg-[#0f101f]" />

      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full 
        bg-purple-600/20 blur-[140px] -z-50" />

      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full 
        bg-blue-600/20 blur-[140px] -z-50" />

      <div className="absolute inset-0 -z-50
        bg-[radial-gradient(circle_at_center,rgba(120,80,255,0.12),transparent_60%)]" />


      {firstTime && (
        <div className="absolute inset-0 opacity-[0.05] -z-50
          [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)]
          [background-size:60px_60px]"
        />
      )}


      <div className="pointer-events-none fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <div
          className={`
px-6 py-3 rounded-md border text-lg transition-all duration-200
${alert.type
              ? `${alertStyles[alert.type]} opacity-100 translate-y-0`
              : "opacity-0 -translate-y-2"}
`}
          aria-live="polite"
        >
          {alert.message}
        </div>
      </div>

      {!hasJoined && (
        <div className="absolute inset-0 flex flex-col justify-center items-center gap-5">

          <h1 className="text-4xl mb-4 font-bold text-white tracking-wide">
            Agario
          </h1>

          <input
            className="
            px-4 py-2 rounded-md border border-white/20
            text-white text-xl bg-white/5 backdrop-blur-md
            placeholder-white/40
            focus:outline-none focus:border-purple-400/70
            focus:ring-2 focus:ring-purple-500/20
            transition-all duration-200
            "
            spellCheck={false}
            placeholder="Name (max 6)"
            maxLength={6}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <div className="flex gap-3">
            <button
              onClick={() => {
                // clearAlert();
                setMenuMode(HOME_PAGE);
                setRoomName(DEFAULT_ROOM);
                roomNameRef.current = DEFAULT_ROOM;
                handleJoinRoom("join");
              }}
              className={accentBtn}
            >
              Start (FFA)
            </button>

            <button
              onClick={() => {
                // clearAlert();
                setMenuMode(menuMode != "join" ? "join" : HOME_PAGE);
              }}
              className={primaryBtn}
            >
              Join Room
            </button>

            <button
              onClick={() => {
                // clearAlert();
                setMenuMode(menuMode != "create" ? "create" : HOME_PAGE);
              }}
              className={primaryBtn}
            >
              Create Room
            </button>
          </div>

          {menuMode === HOME_PAGE && (
            <div className="flex gap-3 mt-2">
              <button onClick={goHome} className={subtleBtn}>🏠 Home</button>
              <button onClick={goProfile} className={subtleBtn}>👤 Profile</button>
            </div>
          )}

          {menuMode === "join" && (
            <div className="w-[540px] max-w-[92vw] p-5 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_60px_rgba(0,0,0,0.45)]">

              <div className="text-xl font-semibold mb-4 text-white tracking-wide">
                Rooms
              </div>

              <div className="max-h-[240px] overflow-auto flex flex-col gap-2">
                {rooms.length === 0 && (
                  <div className="text-zinc-400 text-sm">No rooms right now.</div>
                )}

                {rooms.map((r) => (
                  <div
                    key={r.room}
                    className="
                    flex items-center justify-between rounded-xl px-3 py-2.5
                    bg-white/[0.04] border border-white/10
                    hover:bg-white/[0.07] hover:border-purple-400/40
                    transition-all duration-200
                    "
                  >
                    <div className="text-white">
                      <div className="font-semibold">
                        {r.room} {r.visibility === "private" ? "🔒" : "🌐"}
                      </div>

                      <div className="text-xs text-gray-300">
                        {r.status} • {r.playerCount}/{r.maxPlayers}
                        {r.room !== DEFAULT_ROOM && (
                          <>
                            {" • "}
                            {r.durationMin}m
                            {r.timeLeftSec != null && ` • ${r.timeLeftSec}s left`}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {r.allowSpectators && (
                        <button
                          className={listBtn}
                          onClick={() => {
                            setRoomName(r.room);
                            roomNameRef.current = r.room;
                            setSpectator(true);

                            if (r.visibility === "public") {
                              setJoinKey("");
                              handleJoinRoom("join", true);
                            }
                          }}
                        >
                          👁 Spectate
                        </button>
                      )}

                      <button
                        className={listBtn}
                        onClick={() => {
                          setRoomName(r.room);
                          roomNameRef.current = r.room;
                          setSpectator(false);

                          if (r.visibility === "public") {
                            setJoinKey("");
                            handleJoinRoom("join");
                          }
                        }}
                      >
                        {r.visibility === "public" ? "Join" : "Select"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                <input
                  className="
                  px-4 py-2.5 rounded-lg
                  bg-white/[0.06] border border-white/10
                  text-white placeholder-white/40
                  focus:outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20
                  transition-all duration-200
                  "
                  spellCheck={false}
                  placeholder="Room name (or select above)"
                  maxLength={20}
                  value={roomName}
                  onChange={(e) => {
                    setRoomName(e.target.value);
                    roomNameRef.current = e.target.value;
                  }}
                />

                <input
                  className="
                  px-4 py-2.5 rounded-lg
                  bg-white/[0.06] border border-white/10
                  text-white placeholder-white/40
                  focus:outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20
                  transition-all duration-200
                  "
                  spellCheck={false}
                  maxLength={8}
                  placeholder="Key (only for private rooms)"
                  value={joinKey}
                  onChange={(e) => setJoinKey(e.target.value)}
                />

                <div className="flex gap-3 mt-1">
                  <button
                    onClick={() => {
                      const r = roomName.trim();
                      if (!r) {
                        setAlert({ type: "warning", message: "Room name is missing" });
                        return;
                      }
                      if (!isValidRoomName(r)) {
                        setAlert({ type: "warning", message: "Room name is invalid" });
                        return;
                      }
                      handleJoinRoom("join", isSpectator);
                    }}
                    className={accentBtn}
                  >
                    {isSpectator ? "Spectate" : "Join"}
                  </button>

                  <button
                    onClick={() => {
                      setMenuMode(HOME_PAGE);
                      setRoomName("");
                      roomNameRef.current = "";
                      setJoinKey("");
                      clearAlert();
                    }}
                    className={primaryBtn}
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {menuMode === "create" && (
            <div className="w-[540px] max-w-[92vw] p-5 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_60px_rgba(0,0,0,0.45)]">

              <div className="text-xl font-semibold mb-4 text-white tracking-wide">
                Create Room
              </div>

              <input
                className="
                w-full px-4 py-2 rounded-lg
                bg-white/[0.04] border border-white/15
                text-white placeholder-white/40
                focus:outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20
                transition-all
                "
                spellCheck={false}
                placeholder="Room name (A-Z, 0-9, _ or -)"
                maxLength={20}
                value={roomName}
                onChange={(e) => {
                  roomNameRef.current = e.target.value;
                  setRoomName(e.target.value);
                }}
              />

              <div className="mt-5 flex gap-6">
                {(["public", "private"] as const).map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer text-gray-300">
                    <input
                      type="radio"
                      checked={visibility === v}
                      onChange={() => setVisibility(v)}
                      className="accent-purple-500"
                    />
                    <span className="capitalize">{v}</span>
                  </label>
                ))}
              </div>

              <label className="mt-4 flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSpectators}
                  onChange={(e) => setAllowSpectators(e.target.checked)}
                  className="accent-purple-500"
                />
                Allow spectators
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3">

                <input
                  className="
                  px-4 py-2 rounded-lg
                  bg-white/[0.04] border border-white/15
                  text-white placeholder-white/40
                  focus:outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20
                  "
                  type="number"
                  spellCheck={false}
                  min={MIN_PLAYERS_PER_ROOM}
                  max={MAX_PLAYERS_PER_ROOM}
                  placeholder="Max players"
                  value={maxPlayers}
                  onChange={(e) =>
                    setMaxPlayers(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />

                <input
                  className="
                  px-4 py-2 rounded-lg
                  bg-white/[0.04] border border-white/15
                  text-white placeholder-white/40
                  focus:outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20
                  "
                  type="number"
                  spellCheck={false}
                  min={MIN_MINUTES}
                  max={MAX_MINUTES}
                  placeholder="Duration (minutes)"
                  value={durationMin}
                  onChange={(e) =>
                    setDurationMin(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>

              {visibility === "private" && createdKey && (
                <div className="mt-4 text-center">
                  <div className="text-xs text-gray-400 mb-1">Private Room Key</div>
                  <div className="inline-block font-mono tracking-widest text-lg text-purple-300 border border-purple-400/30 px-4 py-2 rounded-lg bg-purple-500/10">
                    {createdKey}
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-3 justify-between">

                <button
                  onClick={() => {
                    const r = roomName.trim();

                    if (!r) {
                      setAlert({ type: "warning", message: "Room name is missing" });
                      return;
                    }
                    if (!isValidRoomName(r)) {
                      setAlert({ type: "warning", message: "Room name is invalid" });
                      return;
                    }
                    if (maxPlayers === "" || typeof maxPlayers !== "number") {
                      setAlert({ type: "warning", message: "Max players is required" });
                      return;
                    }
                    if (maxPlayers < MIN_PLAYERS_PER_ROOM || maxPlayers > MAX_PLAYERS_PER_ROOM) {
                      setAlert({
                        type: "warning",
                        message: `Max players must be between ${MIN_PLAYERS_PER_ROOM} and ${MAX_PLAYERS_PER_ROOM}`,
                      });
                      return;
                    }
                    if (durationMin === "" || typeof durationMin !== "number") {
                      setAlert({ type: "warning", message: "Duration is required" });
                      return;
                    }
                    if (durationMin < MIN_MINUTES || durationMin > MAX_MINUTES) {
                      setAlert({
                        type: "warning",
                        message: `Duration must be between ${MIN_MINUTES} and ${MAX_MINUTES}`,
                      });
                      return;
                    }

                    handleJoinRoom("create");
                  }}
                  className={accentBtn}
                >
                  Create Room
                </button>

                <button
                  onClick={() => {
                    setMenuMode(HOME_PAGE);
                    setRoomName("");
                    roomNameRef.current = "";
                    setJoinKey("");
                    setCreatedKey("");
                    clearAlert();
                  }}
                  className={primaryBtn}
                >
                  Back
                </button>

              </div>
            </div>
          )}
        </div>
      )
      }

      {
        menuMode === "game over" && (
          <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center text-white z-50">
            <div className="text-4xl mb-6">You Died</div>

            <div className="flex gap-4">
              <button
                onClick={handleRespawn}
                className="
                px-6 py-3 rounded-lg font-semibold
                bg-gradient-to-r from-purple-500 to-blue-500
                text-white hover:brightness-110
                hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]
                transition-all"
              >
                Respawn
              </button>

              <button
                onClick={() => {
                  // isSpectatorRef.current = true;
                  // playerRef.current = randomPlayer();
                  // setAgError("");
                  // setMenuMode(DEFAULT_ROOM);
                  handleJoinRoom("join", true);
                }}
                className="
                px-6 py-3 rounded-lg font-semibold
                bg-gradient-to-r from-purple-500 to-blue-500
                text-white hover:brightness-110
                hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]
                transition-all"
              >
                Spectate
              </button>

              <button
                onClick={() => { backToMainMenu(false); }}
                className="px-6 py-3 bg-zinc-700 text-white rounded-md text-xl hover:bg-zinc-600 transition"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )
      }

      {
        menuMode === "leaderboard" && finalLeaderboard.length > 0 && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <FinalLeaderboard
              leaderboard={finalLeaderboard}
              durationMin={typeof durationMin === "number" ? durationMin : 0}
              backToMainMenu={backToMainMenu}
            />
          </div>
        )
      }

      {
        hasJoined && roomInfo?.status === "waiting" && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-40">

            <div className={`${glassPanel} p-7 w-[620px] max-w-[92vw] text-white`}>

              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold tracking-wide">
                  {roomInfo.visibility === "private" ? "🔒" : "🌐"} {roomInfo.room}
                </div>

                <div className="text-sm text-purple-300 font-semibold">
                  {lobbyPlayers.length}/{roomInfo.maxPlayers} Players
                </div>
              </div>

              <div className="text-gray-400 text-sm">
                Match Duration: {roomInfo.durationMin} min
              </div>

              <div className="mt-6 text-center">
                <div className="text-xl font-semibold text-white animate-pulse">
                  Waiting for players...
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  Game will start once the host begins the match
                </div>
              </div>

              {roomInfo.youAreHost && roomInfo.visibility === "private" && roomInfo.key && (
                <div className="mt-5 text-center">
                  <div className="text-xs text-gray-400 mb-1">Invite Key</div>
                  <div className="font-mono tracking-widest text-lg text-purple-300 border border-purple-400/30 px-4 py-2 rounded-lg inline-block bg-purple-500/10">
                    {roomInfo.key}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="text-sm text-gray-300 mb-2">Players</div>

                <div className="max-h-[240px] overflow-auto space-y-2 pr-1">
                  {lobbyPlayers.map((p) => (
                    <div
                      key={p.id}
                      className={`${glowCard} px-4 py-2 flex justify-between items-center`}
                    >
                      <span className="font-medium text-gray-100">
                        {p.name}
                      </span>

                      {p.id === roomInfo.hostId && (
                        <span className={badge}>HOST</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex gap-3 items-center justify-between">

                {roomInfo.youAreHost ? (
                  <button
                    onClick={() => {
                      socketRef.current?.emit("agario:start-room");
                      clearAlert();
                    }}
                    className={accentBtn}
                  >
                    Start Match
                  </button>
                ) : (
                  <div className="text-gray-400 text-sm">
                    Waiting for host to start…
                  </div>
                )}

                <button
                  onClick={() => backToMainMenu(true)}
                  className={dangerBtn}
                >
                  Leave
                </button>

              </div>

            </div>
          </div>
        )
      }

      {finalStatus && (
        <FinalStatusOverlay
          status={finalStatus}
          onClose={() => {
            setFinalStatus(null);
            backToMainMenu(false);
          }}
        />
      )}
      {
        hasJoined && roomInfo?.status === "started" && (
          <Leaderboard leaderboard={leaderboard} />
        )
      }

      {hasJoined && roomInfo && roomInfo.status === "started" && (
        <TopStatusBar
          roomInfo={roomInfo}
          onLeave={() => { leaveRoom(); }}
        />
      )}
      <canvas ref={canvasRef} id="agario" className="w-full h-full block" />
    </div >
  );
};

export default Agario;

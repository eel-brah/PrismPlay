import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { DEFAULT_ROOM, MAP_HEIGHT, MAP_WIDTH, MAX_MINUTES, MAX_PLAYERS_PER_ROOM, MIN_MINUTES, MIN_PLAYERS_PER_ROOM } from "@/../shared/agario/config";
import { Player } from "@/../shared/agario/player";
import {
  Camera,
  Eject,
  FinalLeaderboardEntry,
  FinalStatus,
  InputState,
  LeaderboardEntry,
  LobbyPlayer,
  Mouse,
  Orb,
  PlayerData,
  RoomInfo,
  RoomSummary,
  Virus,
} from "@/../shared/agario/types";
import { drawEjects, drawOrbs, drawViruses, getOrCreateGuestId, randomColor, randomId, randomPlayer } from "@/../shared/agario/utils";
import { drawGrid } from "@/game/agario/utils";
import { FinalLeaderboard, Leaderboard } from "./LeaderBoard";
import { TopStatusBar } from "./RoomStatusBar";
import { nanoid } from "nanoid"
import { FinalStatusOverlay } from "./FinalStatusOverlay";
import { TOKEN_KEY } from "@/api";

type AlertType = "error" | "warning" | "info" | "";
const alertStyles: Record<Exclude<AlertType, "">, string> = {
  error: "bg-red-100 border-red-300 text-red-700",
  warning: "bg-yellow-100 border-yellow-300 text-yellow-800",
  info: "bg-blue-100 border-blue-300 text-blue-700",
};

const HOME_PAGE = "home"

// localStorage.setItem("access_token", token);
const authToken = localStorage.getItem(TOKEN_KEY);
const sessionId = nanoid();

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

  const pendingInputsRef = useRef<InputState[]>([]);
  // const lastProcessedSeqRef = useRef<number>(0);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState<FinalLeaderboardEntry[]>([]);
  const [finalStatus, setFinalStatus] = useState<FinalStatus | null>(null);

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
  const roomStatusRef = useRef<"waiting" | "started">("waiting");

  useEffect(() => {
    const socket = io("/agario", {
      path: "/socket.io",
      auth: {
        sessionId,
        token: authToken ?? undefined,
        guestId: authToken ? undefined : getOrCreateGuestId(),
      }
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

    socket.on("agario:room-status", (data: { status: "waiting" | "started" }) => {
      setRoomInfo((prev) => (prev ? { ...prev, status: data.status } : prev));
      roomStatusRef.current = data.status;
      if (data.status === "started") setAlert({ type: "", message: "" });
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
    });

    socket.on("agario:leaderboard", (leaderboard: FinalLeaderboardEntry[]) => {
      setFinalLeaderboard(leaderboard)
    });
    // socket.on("leaderboard:final", setLeaderboard);

    socket.on("agario:left-room", () => {
      clearing(Object.keys(enemiesRef.current).length ? HOME_PAGE : "leaderboard");
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
      setAlert({ type: "", message: "" });

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
        }));

        playersArray.sort((a, b) => b.totalMass - a.totalMass);

        const ranked = playersArray.map((p, index) => ({
          ...p,
          rank: index + 1,
          isMe: p.id === myId,
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
        mouseX: worldMouse.x,
        mouseY: worldMouse.y,
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawGrid(ctx, camera);

      ctx.strokeStyle = "#000";
      ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);

      drawOrbs(ctx, orbsRef.current, camera);
      drawEjects(ctx, ejectsRef.current, camera);
      player.draw(ctx, camera);
      for (const enemy of Object.values(enemiesRef.current)) {
        enemy.draw(ctx, camera);
      }
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
      socket.emit("agario:create-room", {
        name,
        room,
        visibility,
        maxPlayers,
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
    if (leave) socketRef.current?.emit("agario:leave-room");
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
    setAlert({ type: "", message: "" });

  }

  return (
    <div className="fixed inset-0">
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
        <div className="absolute inset-0 flex flex-col justify-center items-center gap-4">
          <h1 className="text-4xl mb-4 font-bold text-gray-800">Agario</h1>

          <input
            className="px-4 py-2 rounded-md border-2 border-gray-400 text-black text-xl bg-white focus:outline-none focus:border-gray-600 placeholder-gray-500"
            placeholder="Name (max 6)"
            maxLength={6}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <div className="flex gap-3">
            <button
              onClick={() => {
                setAlert({ type: "", message: "" });
                setMenuMode(HOME_PAGE);
                setRoomName(DEFAULT_ROOM);
                roomNameRef.current = DEFAULT_ROOM;
                handleJoinRoom("join");
              }}
              className="px-6 py-3 bg-gray-300 text-black rounded-md text-xl hover:bg-gray-400 transition"
            >
              Start (FFA)
            </button>

            <button
              onClick={() => {
                setAlert({ type: "", message: "" });
                setMenuMode("join");
              }}
              className="px-6 py-3 bg-gray-300 text-black rounded-md text-xl hover:bg-gray-400 transition"
            >
              Join Room
            </button>

            <button
              onClick={() => {
                setAlert({ type: "", message: "" });
                setMenuMode("create");
              }}
              className="px-6 py-3 bg-gray-300 text-black rounded-md text-xl hover:bg-gray-400 transition"
            >
              Create Room
            </button>
          </div>

          {menuMode === "join" && (
            <div className="w-[560px] max-w-[92vw] bg-white/95 rounded-lg p-4 border border-gray-300">
              <div className="text-black font-bold text-xl mb-2">Rooms</div>

              <div className="max-h-[260px] overflow-auto flex flex-col gap-2">
                {rooms.length === 0 && (
                  <div className="text-gray-700">No rooms right now.</div>
                )}

                {rooms.map((r) => (
                  <div
                    key={r.room}
                    className="flex items-center justify-between border rounded p-2"
                  >
                    <div className="text-black">
                      <div className="font-semibold">
                        {r.room} {r.visibility === "private" ? "🔒" : "🌐"}
                      </div>
                      <div className="text-sm text-gray-700">
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
                          className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
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
                        className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
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

              <div className="mt-4 flex flex-col gap-2">
                <input
                  className="px-4 py-2 rounded-md border-2 border-gray-400 text-black text-xl bg-white"
                  placeholder="Room name (or select above)"
                  maxLength={20}
                  value={roomName}
                  onChange={(e) => {
                    setRoomName(e.target.value);
                    roomNameRef.current = e.target.value;
                  }}
                />

                <input
                  className="px-4 py-2 rounded-md border-2 border-gray-400 text-black text-xl bg-white"
                  placeholder="Key (only for private rooms)"
                  value={joinKey}
                  onChange={(e) => setJoinKey(e.target.value)}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const r = roomName.trim();
                      if (!r) {
                        setAlert({ type: "warning", message: "Room name is missing" });
                        return;
                      }
                      handleJoinRoom("join", isSpectator)
                    }}

                    className="px-6 py-3 bg-gray-500 text-white rounded-md text-xl hover:bg-gray-600 transition"
                  >
                    {isSpectator ? "Spectate" : "Join"}
                  </button>

                  <button
                    onClick={() => {
                      setMenuMode(HOME_PAGE);
                      setRoomName("");
                      roomNameRef.current = "";
                      setJoinKey("");
                      setAlert({ type: "", message: "" });
                    }}
                    className="px-6 py-3 bg-gray-200 text-black rounded-md text-xl hover:bg-gray-300 transition"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {menuMode === "create" && (
            <div className="w-[560px] max-w-[92vw] bg-white/95 rounded-lg p-4 border border-gray-300">
              <div className="text-black font-bold text-xl mb-3">Create Room</div>

              <input
                className="px-4 py-2 rounded-md border-2 border-gray-400 text-black text-xl bg-white w-full"
                placeholder="Room name (A-Z, 0-9, _ or -)"
                maxLength={20}
                value={roomName}
                onChange={(e) => {
                  roomNameRef.current = e.target.value;
                  setRoomName(e.target.value);
                }
                }
              />

              <div className="mt-3 flex gap-5 items-center">
                <label className="text-black flex items-center gap-2">
                  <input
                    type="radio"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                  />
                  Public
                </label>

                <label className="text-black flex items-center gap-2">
                  <input
                    type="radio"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                  />
                  Private
                </label>
              </div>

              <div className="mt-3 flex items-center">
                <label className="text-black flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowSpectators}
                    onChange={(e) => setAllowSpectators(e.target.checked)}
                  />
                  Allow Spectators
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  className="px-4 py-2 rounded-md border-2 border-gray-400 text-black text-xl bg-white"
                  type="number"
                  min={MIN_PLAYERS_PER_ROOM}
                  max={MAX_PLAYERS_PER_ROOM}
                  placeholder="Max players"
                  value={maxPlayers}
                  onChange={(e) =>
                    setMaxPlayers(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
                <input
                  className="px-4 py-2 rounded-md border-2 border-gray-400 text-black text-xl bg-white"
                  type="number"
                  min={MIN_MINUTES}
                  max={MAX_MINUTES}
                  placeholder="Duration (min)"
                  value={durationMin}
                  onChange={(e) =>
                    setDurationMin(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>

              {visibility === "private" && createdKey && (
                <div className="mt-3 px-3 py-2 rounded bg-yellow-100 border border-yellow-300 text-yellow-900">
                  Private Key: <b>{createdKey}</b>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    const r = roomName.trim();
                    if (!r || maxPlayers === 0 || durationMin === 0) {
                      const e = !r ? "Room name is missing" : "Max players or Duration can't be 0";
                      setAlert({ type: "warning", message: e });
                      return;
                    }

                    handleJoinRoom("create");
                  }}
                  className="px-6 py-3 bg-gray-500 text-white rounded-md text-xl hover:bg-gray-600 transition"
                >
                  Create
                </button>

                <button
                  onClick={() => {
                    setMenuMode(HOME_PAGE);
                    setRoomName("");
                    roomNameRef.current = "";
                    setJoinKey("");
                    setCreatedKey("");
                    setAlert({ type: "", message: "" });
                  }}
                  className="px-6 py-3 bg-gray-200 text-black rounded-md text-xl hover:bg-gray-300 transition"
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
                className="px-6 py-3 bg-white text-black rounded-md text-xl hover:bg-gray-200"
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
                className="px-6 py-3 bg-white text-black rounded-md text-xl hover:bg-gray-200"
              >
                Spectate
              </button>

              <button
                onClick={() => { backToMainMenu(false); }}
                className="px-6 py-3 bg-gray-500 text-white rounded-md text-xl hover:bg-gray-600"
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
              durationMin={roomInfo?.durationMin ?? 0}
            />

            <button
              onClick={() => { backToMainMenu(false); }}
              className="mt-8 px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-md text-lg text-white transition"
            >
              Back to Menu
            </button>
          </div>
        )
      }

      {
        hasJoined && roomInfo?.status === "waiting" && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 w-[560px] max-w-[92vw]">
              <div className="text-2xl font-bold text-black flex items-center justify-between">
                <span>
                  Lobby: {roomInfo.room}{" "}
                  {roomInfo.visibility === "private" ? "🔒" : "🌐"}
                </span>
                <span className="text-sm text-gray-600">
                  {lobbyPlayers.length}/{roomInfo.maxPlayers}
                </span>
              </div>

              <div className="text-gray-700 mt-1">
                Duration: {roomInfo.durationMin} minutes
              </div>

              <div className="mt-6 flex items-center justify-center">
                <span className="text-xl font-bold text-black text-center">
                  Waiting for players to join...
                </span>
              </div>

              {roomInfo.youAreHost &&
                roomInfo.visibility === "private" &&
                roomInfo.key && (
                  <div className="mt-3 px-3 py-2 rounded bg-yellow-100 border border-yellow-300 text-yellow-900">
                    Room Key: <b>{roomInfo.key}</b>
                  </div>
                )}

              <div className="mt-4">
                <div className="font-semibold text-black mb-2">Players</div>
                <div className="max-h-[220px] overflow-auto border rounded">
                  {lobbyPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-2 border-b last:border-b-0 flex justify-between"
                    >
                      <span className="text-black">{p.name}</span>
                      {p.id === roomInfo.hostId && (
                        <span className="text-sm text-gray-600">Host</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-3 items-center">
                {roomInfo.youAreHost ? (
                  <button
                    onClick={() => {
                      if (socketRef.current) {
                        socketRef.current.emit("agario:start-room")
                      }
                      setAlert({ type: "", message: "" });
                    }}
                    className="px-5 py-3 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Start Match
                  </button>
                ) : (
                  <div className="text-gray-700">Waiting for host to start…</div>
                )}

                <button
                  onClick={() => { backToMainMenu(true); }}
                  className="px-5 py-3 bg-gray-300 text-black rounded hover:bg-gray-400"
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

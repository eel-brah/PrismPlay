import Game from "./new_game/Game";

export default function App() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100vh",
        background: "#11131a",
      }}
    >
      <Game width={800} height={520} ai={{ enabled: true, controls: "both" }} />
    </div>
  );
}

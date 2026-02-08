import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStoredToken } from "../api"; 
import OnlinePong from "../component/OnlinePong"; // Adjust path if needed

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const token = getStoredToken();

  if (!token) return null;

  return (
    <div className="w-full h-screen bg-black">
      <OnlinePong 
        token={token} 
        inviteId={gameId} 
        onReturn={() => navigate("/social")} 
      />
    </div>
  );
}
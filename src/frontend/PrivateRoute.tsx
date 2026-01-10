import React from "react";
import { Navigate } from "react-router-dom";

type Props = {
  isLoggedIn: boolean;
  children: React.ReactElement;
};

export default function PrivateRoute({ isLoggedIn, children }: Props) {
  if (!isLoggedIn) {
    return <Navigate to="/login/form" replace />;
  }
  return children;
}

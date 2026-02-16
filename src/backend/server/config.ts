import dotenv from "dotenv";
dotenv.config();

export const PORT = parseInt(process.env.PORT || "9443");
export const HTTP_PORT = parseInt(process.env.HTTP_PORT || "9000");
export const IP = process.env.IP || "0.0.0.0";
export const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
export const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
export const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
export const NODE_ENV = process.env.NODE_ENV;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  `https://localhost:${PORT}/api/auth/google/callback`;

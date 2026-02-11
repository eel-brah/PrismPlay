export const MIN_PLAYERS_PER_ROOM = 2;
export const MAX_PLAYERS_PER_ROOM = 50;
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60;

export const DEFAULT_ROOM = "FFA";
export const DEFAULT_ROOM_MAX_PLAYERS = 9999;

export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = 2000;

export const MAX_SPEED = 400;
export const MIN_SPEED = 50;

export const MASS = 110;
export const MAXIMUM_MASS_LIMIT = 1228 * MASS;

export const ORB_RADIUS = 8;
export const INIT_MASS = MASS * 10;

export const ORB_MIN_MASS = MASS;
export const ORB_MAX_MASS = MASS * 5;
export const ORB_GROWTH_DURATION = 60 * 60; // orbs grow from 1 to 5 in 1h
export const ORB_GROWTH_RATE =
  (ORB_MAX_MASS - ORB_MIN_MASS) / ORB_GROWTH_DURATION;

export const MIN_EJECT_MASS = MASS * 35;
export const EJECT_COST = MASS * 18;
export const EJECT_MASS = MASS * 13;
export const EJECT_SPEED = 900;

export const VIRUS_SIZE = 100;
export const VIRUS_RADIUS = VIRUS_SIZE / 2;
export const PADDING = 10;
export const VIRUS_SAFE_RADIUS = VIRUS_RADIUS + PADDING;
export const VIRUS_BASE_MASS = VIRUS_SIZE * MASS;
export const VIRUS_EAT_MIN_MASS = 132 * MASS;
export const VIRUS_MAX_FEED = 7;
export const VIRUS_POP_PIECES = 16;
export const VIRUS_SPLIT_FORCE = 900;
export const VIRUS_PENALTY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
export const VIRUS_EAT_THRESHOLD = 2;

export const MAX_BLOBS_PER_PLAYER = 16;
export const MERGE_BASE_TIME = 30;
export const MERGE_FACTOR = 0.0233;

export const MAX_ORBS = 200;
export const MAX_VIRUSES = 7;

export const MAX_SPECTATORS_PER_ROOM = 15;

export const MIN_SPLIT_MASS = INIT_MASS * 4;
export const SPLIT_LAUNCH_SPEED = 700;
export const SPLIT_FRICTION = 3;

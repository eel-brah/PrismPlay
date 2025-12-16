export const MAP_WIDTH = 2000;
export const MAP_HEIGHT = 2000;

export const MAX_SPEED = 400;
export const MIN_SPEED = 50;

const MASS = 110;
export const MAXIMUM_MASS_LIMIT = 135000;

// export const INIT_RADIUS = 20;
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


export const MAX_ORBS = 200;

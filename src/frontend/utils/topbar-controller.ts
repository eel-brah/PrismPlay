import { createContext, useContext } from "react";

type TopBarController = (visible: boolean) => void;
export const TopBarContext = createContext<TopBarController>(() => {});
export const useTopBar = () => useContext(TopBarContext);

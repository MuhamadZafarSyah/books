import { useMediaQuery } from "usehooks-ts";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY, {
    defaultValue: false,
    initializeWithValue: false,
  });
}

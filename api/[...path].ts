// Single Vercel Function hosting the whole API. `hono/vercel`'s `handle`
// returns a Web-standard (Request → Response) handler that Vercel invokes for
// every /api/* path. Named GET/POST/… exports are Next.js App-Router shape;
// on a plain-Vite Vercel project we default-export a single handler and let
// Hono do the method routing.

import { handle } from "hono/vercel";
import { app } from "../server/router.js";

export const runtime = "nodejs";

export default handle(app);

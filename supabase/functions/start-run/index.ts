import { handle } from "../_shared/portal.ts";
Deno.serve((req) => handle(req, "start-run"));

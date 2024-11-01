import { Application } from "@oak/oak/application";
import { Router } from "@oak/oak/router";

import IndexController from "./Controllers/Index.ts";
import AuthController, { AuthMiddleware } from "./Controllers/Auth.ts";
import LeaguesController from "./Controllers/Leagues.ts";
import { Context } from "jsr:@oak/oak@^16.1.0/context";
import { parseArgs } from "@std/cli/parse-args";

import infoLog from "./infoLog.ts";

const router = new Router();
function useController(path: string, r: Router) {
	router.use(path, r.routes());
	router.use(path, r.allowedMethods());
}
useController("", IndexController);
useController("", AuthController);
useController("/leagues", LeaguesController);

const app = new Application();

app.use(async (ctx: Context, next: () => void) => {
	ctx.response.headers.set("Cache-Control", "no-store");

	await next();
});
app.use(AuthMiddleware);
app.use(router.routes());
app.use(router.allowedMethods());

const args = parseArgs(Deno.args);
const port = typeof args.port == "number"  ? args.port : 3000;
app.state.prod = args.prod == true ? true : false;

app.listen({ port: port });
infoLog(`listening on http://localhost:${port}`)


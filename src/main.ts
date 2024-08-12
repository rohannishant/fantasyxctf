import { Application } from "@oak/oak/application";
import { Router } from "@oak/oak/router";

import IndexController from "./Controllers/Index.ts";
import AuthController, { AuthMiddleware } from "./Controllers/Auth.ts";

import sql from "./db.ts";
console.log(await sql`SELECT user_id, username from users;`);


const router = new Router();
function useController(path: string, r: Router) {
	router.use(path, r.routes());
	router.use(path, r.allowedMethods());
}
useController("", IndexController);
useController("", AuthController);

const app = new Application();
app.use(AuthMiddleware);
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 3000 });
console.log("listening on http://localhost:3000")

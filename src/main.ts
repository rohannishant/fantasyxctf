import { Application } from "@oak/oak/application";
import { Router } from "@oak/oak/router";
import vento from "@vento/vento";

const env = vento({
	autoescape: true,
	includes: "./src/views"
})

const router = new Router();
router.get("/", async ctx => {
	ctx.response.body = (await env.run("template.vto", {"title": "hello world!", "view": "index.vto"})).content;
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 3000 });
console.log("listening on http://localhost:3000")

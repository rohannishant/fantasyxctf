import { Router } from "@oak/oak/router";
import { html } from "@mark/html";
import sql from "../db.ts";
import { encodeBase64, decodeBase64 } from "@std/encoding";
import { Status } from "jsr:@oak/commons@0.11/status";
import { page } from "../page.ts";
import { Context } from "jsr:@oak/oak@^16.1.0/context";

const loginForm = html`
<div class="notice">
<form action="/login" method="post">
	<p>login</p>
	
	<label for="login-username">username:</label>
	<input type="text" id="login-username" name="username" required></input> 
	
	<label for="login-password">password:</label>
	<input type="password" id="login-password" name="password" required></input>

	<input type="submit" value="submit"></input>
</form>
</div>
`;

const router = new Router();
router.get("/login_form", ctx => {
	ctx.response.body = loginForm();
});

router.post("/login", async ctx => {
	const credentials = await ctx.request.body.formData();

	const username = credentials.get("username") as string;
	const password = credentials.get("password") as string;

	const query = await sql`SELECT pass from users WHERE username=${username};`;

	if (query.length > 0 &&
		query[0].pass == password) {
		await ctx.cookies.set("auth", encodeBase64(username + "\n" + password), {httpOnly: true, secure: false});
		ctx.response.headers.set("Location", "/");
		ctx.response.status = Status.SeeOther;
	}
	else {
		ctx.response.status = Status.Unauthorized;
		ctx.response.body = page("login failed", html`
			<h3 style="color: red">login failed, please try again"</h3>
			<a href="/">go back home</a>
			${loginForm}`, ctx.state, false);
	}
});

router.get("/logout", async ctx => {
	await ctx.cookies.delete("auth");
	ctx.response.headers.set("Location", "/");
	ctx.response.status = Status.SeeOther;
});

export default router;

export async function AuthMiddleware(ctx: Context, next: () => any) {
	if (await ctx.cookies.has("auth") && !(await ctx.cookies.get("auth") == undefined)) {
		const b64encoded = await ctx.cookies.get("auth");
		const b64decoded = new TextDecoder().decode(decodeBase64(b64encoded as string));

		const [username, password] = b64decoded.split("\n");

		if (username.length > 0 && password != undefined) {
			const query = await sql`SELECT pass from users WHERE username=${username};`;

			if (query.length > 0 &&
				query[0].pass == password) {
				ctx.state.authenticated = true;
				ctx.state.username = username;
			}
			else {
				ctx.state.authenticated = false;
				await ctx.cookies.delete("auth");
			}
		}
		else {
			ctx.state.authenticated = false;
			await ctx.cookies.delete("auth");
		}
	}
	else {
		ctx.state.authenticated = false;
	}

	return next();
}

import { Router } from "@oak/oak/router";
import { html } from "@mark/html";
import sql from "../db.ts";
import { encodeBase64, decodeBase64 } from "@std/encoding";
import { Status } from "jsr:@oak/commons@0.11/status";
import { page } from "../page.ts";
import { Context } from "jsr:@oak/oak@^16.1.0/context";
import infoLog from "../infoLog.ts";

const loginForm = html`
<form action="/login" method="post">
	<fieldset>
		<legend>login</legend>
		
		<label for="login-username">username:</label>
		<input type="text" id="login-username" name="username" required maxlength="20"></input> 
		
		<label for="login-password">password:</label>
		<input type="password" id="login-password" name="password" required maxlength="20"></input>

		<div id="captcha-login"></div>
		<script>
			turnstile.render("#captcha-login", {sitekey: "0x4AAAAAAAh4SI_cO-K320Qt",
			callback: () => {
				document.querySelector("#login-submit").disabled = false;
			}
			});
		</script>

		<input id="login-submit" type="submit" value="submit" disabled></input>
	</fieldset>
</form>
`;

const signupForm = html`
<form action="/signup" method="post">

	<fieldset>
		<legend>sign up</legend>
		<p>max 20 characters for username and password. username must contain no spaces or special characters except underscore.</p>
		
		<label for="signup-username">username:</label>
		<input type="text" id="signup-username" name="username" required maxlength="20"></input> 
		
		<label for="signup-password">password:</label>
		<input type="password" id="signup-password" name="password" required maxlength="20"></input>

		<label for="signup-password-confirm">confirm password:</label>
		<input type="password" id="signup-password-confirm" name="confirmpassword" required maxlength="20"></input>

		<div id="captcha-signup"></div>
		<script>
			turnstile.render("#captcha-signup", {sitekey: "0x4AAAAAAAh4SI_cO-K320Qt",
				callback: () => {
					document.querySelector("#signup-submit").disabled = false;
				}
			});
		</script>

		<input id="signup-submit" type="submit" value="submit" disabled></input>
	</fieldset>
</form>
`;

const deleteForm = html`
<form action="/account/delete" method="post">
	<fieldset>
		<legend>delete account</legend>

		<input type="checkbox" id="sure1" name="sure1" _="on click toggle @disabled on #delete-submit"/>
		<label for="sure1">are you sure?</label>

		<input type="submit" value="submit" id="delete-submit" disabled></input>
	</fieldset>
</form>
`;

async function cookieAuth(ctx: Context, username: string, password: string) {
	await ctx.cookies.set("auth", encodeBase64(username + "\n" + password), {httpOnly: true, secure: false, sameSite: "strict"});
}

const router = new Router();
router.get("/login_form", ctx => {
	ctx.response.headers.set("Cache-Control", "public, max-age=3600, immutable")
	ctx.response.body = loginForm();
});

router.post("/login", async ctx => {
	try	{
		const credentials = await ctx.request.body.formData();
		let captcha = false;

		if (credentials.has("cf-turnstile-response")) {
			const bodyFormData = new FormData();
			bodyFormData.set("secret", "0x4AAAAAAAh4SHUa_OQNitDF_v8DId12O78");
			bodyFormData.set("response", (credentials.get("cf-turnstile-response") as string).toString());
			bodyFormData.set("remoteip", ctx.request.ip);
			bodyFormData.set("sitekey", "0x4AAAAAAAh4SI_cO-K320Qt");

			const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
				method: "POST",
				body: bodyFormData
			});
			captcha = (await response.json()).success;
		}

		let username = credentials.get("username") as string;
		const password = credentials.get("password") as string;

		if (captcha &&
			username != null && password != null) {
			username = username.toLowerCase().trim();

			const query = await sql`SELECT pass from users WHERE username=${username};`;
			if (query.length > 0 &&
				query[0].pass == password) {
				await cookieAuth(ctx, username, password);
				ctx.response.headers.set("Location", "/");
				ctx.response.status = Status.SeeOther;
				infoLog(`${ctx.request.ip} logged in as ${username}`);
			}
			else {
				ctx.response.status = Status.Unauthorized;
				ctx.response.body = page("login failed", html`
					<h3 style="color: red">login failed, check username or password</h3>
					<a href="/">go back home</a>
					${loginForm}`, ctx.state, false);
				infoLog(`${ctx.request.ip} failed to login as ${username}`);
			}
		}
		else {
			ctx.response.status = Status.Unauthorized;
			ctx.response.body = page("login failed", html`
				<h3 style="color: red">login failed, please try again</h3>
				<a href="/">go back home</a>
				${loginForm}`, ctx.state, false);
			infoLog(`${ctx.request.ip} tried to login, possibly without username, password, or captcha`);
		}
	}
	catch(error) {
		ctx.response.status = Status.Teapot;
		ctx.response.body = "error";
		console.error(error);
		infoLog(`${ctx.request.ip} tried to login, possibly without submitting form data`);
	}
});

router.get("/logout", async ctx => {
	await ctx.cookies.delete("auth");
	ctx.response.headers.set("Location", "/");
	ctx.response.status = Status.SeeOther;
});

router.get("/signup_form", ctx => {
	ctx.response.headers.set("Cache-Control", "public, max-age=3600, immutable")
	ctx.response.body = signupForm();
})

router.get("/account/delete_form", ctx => {
	ctx.response.headers.set("Cache-Control", "public, max-age=3600, immutable")
	ctx.response.body = deleteForm();
});

router.post("/account/delete", async ctx => {
	if (ctx.state.authenticated) {
		await sql`DELETE from users WHERE username=${ctx.state.username}`;

		ctx.response.body = page("account deleted", html`
				<p style="color: green;">your account has been deleted</p>
				<a href="/">go back home</a>
			`, ctx.state, false);
		infoLog(`${ctx.request.ip} deleted account "${ctx.state.username}"`);
	}
	else {
		ctx.response.headers.set("Location", "/");
		ctx.response.status = Status.SeeOther;
		infoLog(`${ctx.request.ip} tried to delete account without authenticating`);
	}
});

router.post("/signup", async ctx => {
	try {
		const credentials = await ctx.request.body.formData();
		let captcha = false;

		if (credentials.has("cf-turnstile-response")) {
			const bodyFormData = new FormData();
			bodyFormData.set("secret", "0x4AAAAAAAh4SHUa_OQNitDF_v8DId12O78");
			bodyFormData.set("response", (credentials.get("cf-turnstile-response") as string).toString());
			bodyFormData.set("remoteip", ctx.request.ip);
			bodyFormData.set("sitekey", "0x4AAAAAAAh4SI_cO-K320Qt");

			const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
				method: "POST",
				body: bodyFormData
			});
			captcha = (await response.json()).success;
		}

		let username = credentials.get("username") as string;
		const password = credentials.get("password") as string;
		const confirmPassword = credentials.get("confirmpassword") as string;
		if (username != null) {
			username = username.toLowerCase().trim();
		}

		const re = /^[a-zA-Z0-9_]+$/;

		if (username != null && !re.test(username)) {
			ctx.response.status = Status.BadRequest;
			ctx.response.body = page("failed to sign up", html`
				<p style="color: red">sorry, your username contained invalid characters</p>
				<a href="/">go back home</a>
				${signupForm}`, ctx.state, false);
				infoLog(`${ctx.request.ip} tried signing up with invalid username "${username}"`);
		}
		else if (username != null && (await sql`SELECT from users WHERE username=${username}`).length > 0) {
			ctx.response.status = Status.BadRequest;
			ctx.response.body = page("failed to sign up", html`
				<p style="color: red">sorry, that username already exists</p>
				<a href="/">go back home</a>
				${signupForm}`, ctx.state, false);
				infoLog(`${ctx.request.ip} tried signing up with existing username "${username}"`);
		}
		else if (captcha && username != null && password != null && confirmPassword != null && !username.includes("\n") && !password.includes("\n") &&
		username.length > 0 && username.length <= 20 && password.length > 0 && password.length <= 20) {
			
			if (password == confirmPassword) {
				await sql`INSERT INTO users (username, pass) VALUES (${username}, ${password})`;
				await cookieAuth(ctx, username, password);
				ctx.response.headers.set("Location", "/");
				ctx.response.status = Status.SeeOther;
				infoLog(`${ctx.request.ip} signed up as "${username}"`);
			}
			else {
				ctx.response.status = Status.BadRequest;
				ctx.response.body = page("failed to sign up", html`
					<p style="color: red">sorry, your passwords did not match</p>
					<a href="/">go back home</a>
					${signupForm}`, ctx.state, false);
				infoLog(`${ctx.request.ip} tried signing up as  without matching passwords`);
			}
		}
		else {
			ctx.response.status = Status.BadRequest;
			ctx.response.body = page("failed to sign up", html`
				<p style="color: red">failed to create account, please make sure you entered everything correctly</p>
				<a href="/">go back home</a>
				${signupForm}`, ctx.state, false);
				infoLog(`${ctx.request.ip} tried signing up with invalid input`);
		}
	}
	catch(error) {
		ctx.response.status = Status.Teapot;
		ctx.response.body = "error";
		console.error(error);
		infoLog(`${ctx.request.ip} tried to sign up, possibly without form data`);
	}
});

export default router;

export async function AuthMiddleware(ctx: Context, next: () => any) {
	if (await ctx.cookies.has("auth") && !(await ctx.cookies.get("auth") == undefined)) {
		const b64encoded = await ctx.cookies.get("auth");
		const b64decoded = new TextDecoder().decode(decodeBase64(b64encoded as string));

		const [username, password] = b64decoded.split("\n");

		if (username.length > 0 && password != undefined) {
			const query = await sql`SELECT user_id, pass, user_role from users WHERE username=${username};`;

			if (query.length > 0 &&
				query[0].pass == password) {
				ctx.state.authenticated = true;
				ctx.state.username = username;
				ctx.state.user_id = query[0].user_id;
				ctx.state.user_role = query[0].user_role;
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

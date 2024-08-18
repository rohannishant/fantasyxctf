import { Router } from "@oak/oak/router";
import { page } from "../page.ts";
import { html } from "@mark/html";

const router = new Router();
router.get("/", ctx => {
	ctx.response.body = page("fantasyxctf",
		html`
			${ ctx.state.authenticated ? 
			html`<a class="button" href="/leagues">view leagues</a>`
			:
			html`<p>please login to play fantasy</p>`}
		`,
		ctx.state, true
	);
});

router.get("/robots.txt", ctx => {
	ctx.response.body = 
`User-Agent: *
Disallow: /`;
})

export default router;

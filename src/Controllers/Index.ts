import { Router } from "@oak/oak/router";
import { page } from "../page.ts";
import { html } from "@mark/html";

const router = new Router();
router.get("/", ctx => {
	ctx.response.body = page("fantasyxctf",
		html`
			<p>Welcome!</p>
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

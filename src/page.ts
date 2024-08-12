import { html, raw } from "@mark/html";

export const page = (title: string, body: () => string, state: any, showAuth: boolean) => html`
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>${title}</title>
		<link rel="stylesheet" href="https://unpkg.com/simpledotcss/simple.min.css" integrity="sha384-HMGsCv5Lq6X1ZOcjIOJ7l4+vsd85x7ZaBKyDnL7aNdac5hux7LCt0qstmK6ILfjT" crossorigin="anonymous">
		<script src="https://unpkg.com/htmx.org@2.0.1/dist/htmx.js" integrity="sha384-gpIh5aLQ0qmX8kZdyhsd6jA24uKLkqIr1WAGtantR4KsS97l/NRBvh8/8OYGThAf" crossorigin="anonymous"></script>	
	</head>
	<body>
		<h1>fantasy xc</h1>
		${ showAuth ? html`<div class="notice">
			${state.authenticated ? 
				html`<p>logged in as ${state.username}</p> <a href="/logout">log out</a>` :

				html`<p>you are not logged in</p>
				<ul>
				<li><button hx-get="/login_form" hx-target="#form-container" hx-swap="innerHTML">log in</button></li>
				<li><button hx-get="/signup" hx-target="#form-container" hx-swap="innerHTML">sign up</a></li>
				</ul>`
			}
			<div id="form-container"></div>
		</div>` : ""}
		${raw(body())}
		<footer><p>made by Rohan Nishant</p></footer>
	</body>
</html>
`();



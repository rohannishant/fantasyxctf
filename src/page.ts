import { html, raw } from "@mark/html";

export const page = (title: string, body: () => string, state: any, showAuth: boolean) => html`
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>${title}</title>
		<link rel="stylesheet" href="https://unpkg.com/simpledotcss@2.3.2/simple.min.css" integrity="sha384-a8MdcEOz+xtPJb1l6GTwApIkj5ou00axL+3y5Yps9lyCkNGQ8tteJhV+YMbvT/Mr" crossorigin="anonymous">
		<link rel="stylesheet" href="https://unpkg.com/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" integrity="sha384-XGjxtQfXaH2tnPFa9x+ruJTuLE3Aa6LhHSWRr1XeTyhezb4abCG4ccI5AkVDxqC+" crossorigin="anonymous">
		<link rel="icon" href="/favicon.png" />
		<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
		<script src="https://unpkg.com/htmx.org@2.0.2/dist/htmx.min.js" integrity="sha384-Y7hw+L/jvKeWIRRkqWYfPcvVxHzVzn5REgzbawhxAuQGwX1XWe70vji+VSeHOThJ" crossorigin="anonymous"></script>
		<script src="https://unpkg.com/hyperscript.org@0.9.12" integrity="sha384-+Uth1QzYJsTjnS5SXVN3fFO4I32Y571xIuv53WJ2SA7y5/36tKU1VCutONAmg5eH" crossorigin="anonymous"></script>
		<style>
			
			.invisible {
				display: none;
			}

			ul#auth_options > li {
				margin: 1em;
			}

			mark.underclassman {
				color: white;
				background-color: green;
				font-family: monospace;
			}
			mark.upperclassman {
				color: white;
				background-color: purple;
				font-family: monospace;
			}

			.firstplace {
				background-color: gold;
				color: black;
			}
			.secondplace {
				background-color: silver;
				color: black;
			}
			.thirdplace {
				background-color: sandybrown;
				color: black;
			}
			.reallygood {
				background-color: seagreen;
				color: white;
			}
			.good {
				background-color: lightgreen;
				color: black;
			}
			.mid {
				background-color: khaki;
				color: black;
			}
			.bad {
				background-color: lightcoral;
				color: black
			}
			.reallybad {
				background-color: firebrick;
				color: white;
			}

			mark.role_OG {
				background-image: linear-gradient(darkorchid, dodgerblue);
				color: white;
			}
			mark.role_DEV {
				background-image: linear-gradient(darkslategrey, lightskyblue);
				color: white;
			}

			mark.sexm {
				background-color: blue;
				color: white;
				font-family: monospace;
			}
			mark.sexf {
				background-color: deeppink;
				color:white;
				font-family: monospace;
			}
			mark.sexunknown {
				background-color: dimgrey;
				color: white;
				font-family: monospace;
			}

			.itsme {
				font-weight: bold;
			}

			#form-container {
				width: fit-content;
			}

			details[open] summary ~ *:not(.htmx-indicator) {
				animation: details_open 1s ease-in-out;
			}

			@keyframes details_open {
				0%    {opacity: 0; }
				100%  {opacity: 1; }
			}
		</style>
	</head>
	<body>
		<h1>fantasy xc</h1>
		${ showAuth ? html`<div class="notice">
			${state.authenticated ? 
				html`<p><i aria-hidden="true" class="bi bi-person-fill"></i> logged in as ${state.username}${state.user_role == null ? "" : html` <mark class="role_${state.user_role}">${state.user_role}</mark>`}</p>
				<ul id="auth_options">
				<li><a class="button" href="/logout"><i aria-hidden="true" class="bi bi-door-open-fill"></i> log out</a></li>
				<li><button hx-get="/account/delete_form" hx-target="#form-container" hx-swap="innerHTML"><i aria-hidden="true" class="bi bi-x-circle-fill"></i> delete account</button></li>
				</ul>` :

				html`<p><i aria-hidden="true" class="bi bi-person-fill-x"></i> you are not logged in</p>
				<ul id="auth_options">
				<li><button hx-get="/login_form" hx-target="#form-container" hx-swap="innerHTML" hx-indicator="#auth-loading"><i aria-hidden="true" class="bi bi-box-arrow-in-right"></i> log in</button></li>
				<li><button hx-get="/signup_form" hx-target="#form-container" hx-swap="innerHTML" hx-indicator="#auth-loading"><i aria-hidden="true" class="bi bi-person-plus-fill"></i> sign up</a></li>
				</ul>`
			}
			<span id="auth-loading" class="htmx-indicator">loading...</span>
			<div id="form-container"></div>
		</div>` : ""}
		${raw(body())}
		<footer>
			<p>
				fantasyxctf alpha v1.4.5<br/>
				made by Rohan Nishant
			</p>
		</footer>
	</body>
</html>
`();



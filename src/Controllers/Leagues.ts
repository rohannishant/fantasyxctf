import { Router } from "@oak/oak/router";
import { page } from "../page.ts";
import { html } from "@mark/html";
import sql from "../db.ts";
import { Status } from "jsr:@oak/commons@0.11/status";

interface leagueTable {
    league_id: number,
    league_name: string,
    season_id: number
}

interface seasonTable {
    season_id: number,
    season_name: string
}

interface athleteTable {
    athlete_id: number,
    athlete_name: string,
    athlete_year: number,
    season_id: number
}

interface meetTable {
    meet_id: number,
    meet_name: string,
    season_id: number
}

interface raceTable {
    race_id: number,
    score: number,
    previous_minutes: number,
    previous_seconds: number,
    finish_minutes: number,
    finish_seconds: number,
    athlete_id: number,
    meet_id: number
}

interface scoreSelect {
    total_score: number,
    avg_score: number,
}

const router = new Router();
router.get("/", async ctx => {
	if (ctx.state.authenticated) {
        ctx.response.body = page("fantasy leagues",
            html`
                <a href="/">go home</a>
    
                <p>joinable leagues</p>
                <ul>
                    ${
                        await (async () => {
                            const query: any[] = await sql`SELECT * from leagues WHERE league_id NOT IN (SELECT league_id FROM leaguemembers WHERE user_id = ${ctx.state.user_id});`;
    
                            if (query.length > 0) {                   
                                return query.map((league: leagueTable) =>
                                    html`<li><a href="/leagues/join/${league.league_id.toString()}">${league.league_name}</a></li>`
                                )
                            }
                            return [html`<li>no joinable leagues...</li>`];
                        })()
                    }
                </ul>
    
                <p>joined leagues</p>
                <ul>
                    ${
                        await (async () => {
                            const query: any[] = await sql`SELECT * from leagues WHERE league_id IN (SELECT league_id FROM leaguemembers WHERE user_id = ${ctx.state.user_id});`;
    
                            if (query.length > 0) {                   
                                return query.map((league: leagueTable) =>
                                    html`<li><a href="/leagues/${league.league_id.toString()}">${league.league_name}</a></li>`
                                )
                            }
                            return [html`<li>no leagues joined...</li>`];
                        })()
                    }
                </ul>
            `,
            ctx.state, true
        );
    }
    else {
        ctx.response.status = Status.SeeOther;
        ctx.response.headers.set("Location", "/");
    }
});

function athleteYear(year: number) {
    switch(year) {
        case 1:
            return html`<mark class="underclassman">FR</mark>`
        case 2:
            return html`<mark class="underclassman">SO</mark>`
        case 3:
            return html`<mark class="upperclassman">JR</mark>`
        case 4:
            return html`<mark class="upperclassman">SR</mark>`
    }
    return html`<mark>??</mark>`;
}

router.post("/meetinfo", async ctx => {
    const formData = await ctx.request.body.formData();
    if (ctx.state.authenticated && formData.has("meet_id") && (formData.get("meet_id") as FormDataEntryValue).toString().length > 0) {
        const query: (raceTable & athleteTable)[] = await sql`SELECT * FROM races INNER JOIN athletes ON races.athlete_id = athletes.athlete_id WHERE races.meet_id = ${formData.get("meet_id")?.toString()} ORDER BY races.score DESC;`

        if (query.length > 0) {
            ctx.response.body = html`
            <figure>
                <table>
                    <caption>${(await sql`SELECT meet_name FROM meets WHERE meet_id=${formData.get("meet_id")}`)[0].meet_name}</caption>
                    <tr>
                        <th>place</th>
                        <th>name</th>
                        <th>year</th>
                        <th>prev.</th>
                        <th>finish</th>
                        <th>score</th>
                    </tr>
                    ${
                        query.map((race, i) =>
                            html`
                            <tr>
                                <td class="${i == 0 ? "firstplace" : i == 1 ? "secondplace" : i == 2 ? "thirdplace" : ";"}">${(i + 1).toString()}</td>
                                <td>${race.athlete_name}</td>
                                <td>${athleteYear(race.athlete_year)}</td>
                                <td>${race.previous_minutes.toString()}:${race.previous_seconds.toString().padStart(2,"0")}</td>
                                <td>${race.finish_minutes.toString()}:${race.finish_seconds.toString().padStart(2,"0")}</td>
                                <td class="${race.score >= 100 ? "better" : "worse"}">${race.score.toString()}</td>
                            </tr>
                            `
                        )
                    }
                </table>
                </figure>
            `;
        }
        else {
            ctx.response.body = html`<p style="color: red">could not get meet info (try checking later)</p>`;
        }
    }
    else {
        ctx.response.body = html`<p style="color: red">could not get meet info</p>`;
    }
});

router.get("/:id", async ctx => {
    const query: (leagueTable & seasonTable)[] = await sql`SELECT league_name, season_name, seasons.season_id FROM leagues INNER JOIN seasons ON leagues.season_id = seasons.season_id WHERE league_id=${ctx.params.id};`;
    if (ctx.state.authenticated &&
        query.length > 0 &&
        ((await sql`SELECT FROM leaguemembers WHERE user_id = ${ctx.state.user_id} AND league_id = ${ctx.params.id}`) as any[])
        .length > 0
    ) {
        ctx.response.body = page(`league: ${query[0].league_name}`,
            html`
                <a href="/leagues">back to leagues</a>
                <h2>${query[0].league_name}</h2>
                <p>season: ${query[0].season_name}</p>

                <details>
                    <summary>league standings</summary>
                    <ol>
                        ${((await sql`SELECT user_id, username from users WHERE user_id IN (SELECT user_id FROM leaguemembers WHERE league_id = ${ctx.params.id});`) as any[])
                           .map(
                                (user) => html`<li>${user.username}</li>`
                           )
                        }
                    </ol>
                </details>
                <details>
                    <summary>athletes</summary>
                        ${
                            await (async () => {
                                const query_athletes: (athleteTable & scoreSelect)[] = await sql`
                                    WITH scores AS (SELECT athlete_id, SUM(races.score) total_score, AVG(races.score) avg_score FROM races GROUP BY athlete_id)
                                    SELECT athletes.athlete_id, athletes.athlete_name, athletes.athlete_year, COALESCE(scores.total_score, 0) total_score, COALESCE(scores.avg_score, 0) avg_score FROM athletes
                                    LEFT JOIN scores ON athletes.athlete_id = scores.athlete_id
                                    WHERE athletes.season_id = ${query[0].season_id}
                                    ORDER BY total_score DESC;
                                `;

                                if (query_athletes.length > 0) {
                                    return html`
                                        <figure>
                                            <table>
                                                <tr>
                                                    <th>place</th>
                                                    <th>name</th>
                                                    <th>year</th>
                                                    <th>avg.</th>
                                                    <th>total</th>
                                                </tr>
                                                ${
                                                    query_athletes.map((athlete, i) => html`
                                                    <tr>
                                                        <td class="${i == 0 ? "firstplace" : i == 1 ? "secondplace" : i == 2 ? "thirdplace" : ";"}">${(i + 1).toString()}</td>
                                                        <td>${athlete.athlete_name}</td>
                                                        <td>${athleteYear(athlete.athlete_year)}</td>
                                                        <td>${athlete.avg_score.toFixed(2)}</td>
                                                        <td>${athlete.total_score.toFixed(2)}</td>
                                                    </tr>
                                                    `)
                                                }
                                                <caption>${query[0].season_name}</caption>
                                            </table>
                                        </figure>
                                    `
                                }
                                return html`<p style="color: red">no athletes yet? try again later</p>`
                            })()
                        }
                </details>

                <details>
                        <summary>meets</summary>
                        <label for="meet-lookup">select a meet to view</label>

                        <select name="meet_id" id="meet-lookup" _="on change set #meet-viewer's innerHTML to ''">
                            <option value="">(select a meet)</option>

                            ${
                                await (async () => {
                                    const query: meetTable[] = await sql`SELECT meet_id, meet_name FROM meets WHERE season_id IN (SELECT season_id FROM leagues WHERE league_id = ${ctx.params.id});`;
                                    
                                    if (query.length > 0) {
                                        return query.map(meet =>
                                            html`
                                                <option value="${meet.meet_id.toString()}">${meet.meet_name}</option>
                                            `
                                        )
                                    }

                                    return html``
                                })()
                            }
                        </select>
                        <button hx-post="/leagues/meetinfo" hx-target="#meet-viewer" hx-swap="innerHTML" hx-include="#meet-lookup">view meet stats</button>
                        <div id="meet-viewer"></div>
                </details>
            `,
            ctx.state,
            true
        )
    }
    else {
        ctx.response.status = Status.SeeOther;
        ctx.response.headers.set("Location", "/leagues");
    }
});

router.get("/join/:id", async ctx => {
    if (ctx.state.authenticated) {
        const query: leagueTable[] = await sql`SELECT * from leagues WHERE league_id=${ctx.params.id}`;
        if (query.length > 0
            && (await sql`SELECT from leaguemembers WHERE user_id = ${ctx.state.user_id} AND league_id = ${ctx.params.id}`).length == 0) {
                await sql`INSERT INTO leaguemembers (user_id, league_id) VALUES (${ctx.state.user_id}, ${ctx.params.id})`;
        }
        ctx.response.status = Status.SeeOther;
        ctx.response.headers.set("Location", "/leagues");
    }
    else {
        ctx.response.status = Status.SeeOther;
        ctx.response.headers.set("Location", "/");
    }
});

export default router;

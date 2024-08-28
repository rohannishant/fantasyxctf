import { Router } from "@oak/oak/router";
import { page } from "../page.ts";
import { html } from "@mark/html";
import sql from "../db.ts";
import { Status } from "jsr:@oak/commons@0.11/status";
import infoLog from "../infoLog.ts";

interface leagueTable {
    league_id: number,
    league_name: string,
    season_id: number
}

interface seasonTable {
    season_id: number,
    season_name: string,
    current_meet: number | null
}

interface athleteTable {
    athlete_id: number,
    athlete_name: string,
    athlete_year: number,
    season_id: number,
    sex: string
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
    place: number
}

interface meetPicks {
    picks_id: number,
    user_id: number,
    meet_id: number, 
    league_id: number,
    pick1: number | null,
    pick2: number | null,
    pick3: number | null
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
                            const query: leagueTable[] = await sql`SELECT * from leagues WHERE joinable=TRUE AND league_id NOT IN (SELECT league_id FROM leaguemembers WHERE user_id = ${ctx.state.user_id});`;
    
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
                            const query: leagueTable[] = await sql`SELECT * from leagues WHERE league_id IN (SELECT league_id FROM leaguemembers WHERE user_id = ${ctx.state.user_id});`;
    
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

function scoreColorClass(score: number) {
    if (score >= 90) return "reallygood";
    if (score >= 75) return "good";
    if (score >= 60) return "mid";
    if (score >= 50) return "bad";
    return "reallybad";
}

function placeColorClass(place: number) {
    if (place == 1) return "firstplace";
    if (place == 2) return "secondplace";
    if (place == 3) return "thirdplace";
    return "";
}

function sexColorClass(sex: string) {
    if (sex == "M") return "sexm";
    if (sex == "F") return "sexf";

    return "sexunknown";
}

interface standingsQuery {
    user_id: number,
    username: string,
    total_score: number,
    place: number,
    user_role: string | null
}

router.post("/meetinfo", async ctx => {
    const formData = await ctx.request.body.formData();
    if (ctx.state.authenticated && formData.has("meet_id") && (formData.get("meet_id") as FormDataEntryValue).toString().length > 0) {
        const query: (raceTable & athleteTable & { place: number} )[] = await sql`SELECT * , rank() OVER ( ORDER BY races.score DESC ) place FROM races INNER JOIN athletes ON races.athlete_id = athletes.athlete_id WHERE races.meet_id = ${(formData.get("meet_id") as FormDataEntryValue).toString()};`

        if (query.length > 0) {
            ctx.response.body = html`
            <figure>
                <table>
                    <caption>${(await sql`SELECT meet_name FROM meets WHERE meet_id=${(formData.get("meet_id") as FormDataEntryValue).toString()}`)[0].meet_name}</caption>
                    <tr>
                        <th>place</th>
                        <th>name</th>
                        <th>sex</th>
                        <th>year</th>
                        <th>prev.</th>
                        <th>finish</th>
                        <th>score</th>
                    </tr>
                    ${
                        query.map(race =>
                            html`
                            <tr>
                                <td class="${placeColorClass(race.place)}">${(race.place).toString()}</td>
                                <td>${race.athlete_name}</td>
                                <td><mark class="${sexColorClass(race.sex)}">${race.sex}</mark></td>
                                <td>${athleteYear(race.athlete_year)}</td>
                                <td>${race.previous_minutes.toString()}:${race.previous_seconds.toString().padStart(2,"0")}</td>
                                <td>${race.finish_minutes.toString()}:${race.finish_seconds.toString().padStart(2,"0")}</td>
                                <td class="${scoreColorClass(race.score)}">${race.score.toString()}</td>
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

router.post("/athleteinfo", async ctx => {
    const formData = await ctx.request.body.formData();
    if (ctx.state.authenticated && formData.has("athlete_id") && (formData.get("athlete_id") as FormDataEntryValue).toString().length > 0) {
        const query: (raceTable & meetTable)[] = await sql`SELECT * FROM races INNER JOIN meets ON races.meet_id = meets.meet_id WHERE athlete_id = ${(formData.get("athlete_id") as FormDataEntryValue).toString()};`;
        
        if (query.length > 0) {
            ctx.response.body = html`
            <figure>
                <table>
                    <caption>${(await sql`SELECT athlete_name FROM athletes WHERE athlete_id=${(formData.get("athlete_id") as FormDataEntryValue).toString()}`)[0].athlete_name}</caption>
                    <tr>
                        <th>#</th>
                        <th>meet</th>
                        <th>prev.</th>
                        <th>finish</th>
                        <th>score</th>
                    </tr>
                    ${
                        query.map((race, i) =>
                            html`
                            <tr>
                                <td>${(i + 1).toString()}</td>
                                <td>${race.meet_name}</td>
                                <td>${race.previous_minutes.toString()}:${race.previous_seconds.toString().padStart(2, "0")}</td>
                                <td>${race.finish_minutes.toString()}:${race.finish_seconds.toString().padStart(2, "0")}</td>
                                <td class="${scoreColorClass(race.score)}">${race.score.toString()}</td>
                            </tr>
                            `
                        )
                    }
                </table>
                </figure>
            `;
        }
        else {
            ctx.response.body = html`<p style="color: red">could not get athlete info (try checking later)</p>`;
        }
    }
    else {
        ctx.response.body = html`<p style="color: red">could not get athlete info</p>`;
    }
});

router.post("/:id/meetpicks", async ctx => {
    try {
        const formData = await ctx.request.body.formData();        

        const query1: (leagueTable & seasonTable)[] = await sql`SELECT * from leagues INNER JOIN seasons ON leagues.season_id = seasons.season_id WHERE leagues.league_id = ${ctx.params.id}`;
        
        if (ctx.state.authenticated &&
            (await sql`SELECT FROM leaguemembers WHERE league_id = ${ctx.params.id} AND user_id = ${ctx.state.user_id};`).length > 0 &&
            query1.length > 0 && query1[0].current_meet != null && formData.has("pick1") && formData.has("pick2") && formData.has("pick3")) {
            const pickCount = [formData.get("pick1")?.toString(), formData.get("pick2")?.toString(), formData.get("pick3")?.toString()]
            .filter(pick => pick != "null").length;

            const pick1 = formData.get("pick1") == "null" ? null : (formData.get("pick1") as string).toString();
            const pick2 = formData.get("pick2") == "null" ? null : (formData.get("pick2") as string).toString();
            const pick3 = formData.get("pick3") == "null" ? null : (formData.get("pick3") as string).toString();

            const query2: athleteTable[] = await sql`
                SELECT * from athletes
                WHERE (
                    athlete_id = ${pick1} OR
                    athlete_id = ${pick2} OR
                    athlete_id = ${pick3}
                )
                AND season_id = ${query1[0].season_id}
            `;
            
            if (query2.length == pickCount) {

                await sql`DELETE from meetpicks WHERE meet_id = ${query1[0].current_meet} AND user_id = ${ctx.state.user_id};`
                await sql`INSERT into meetpicks (user_id, meet_id, league_id, pick1, pick2, pick3)
                VALUES (${ctx.state.user_id}, ${query1[0].current_meet}, ${ctx.params.id}, ${pick1}, ${pick2}, ${pick3})`;

                ctx.response.body = html`<p style="color: green">
                    saved ${pickCount.toString()} pick(s) <br/>
                    ${query2.map(athlete => athlete.athlete_name).join(", ")}
                </p>`;
                infoLog(`"${ctx.state.username}" (${ctx.request.ip}) made their picks. nice!`);
            }
            else {
                ctx.response.body = html`<p style="color: red">error saving picks, make sure there are no duplicates</p>`;
                infoLog(`"${ctx.state.username}" (${ctx.request.ip}) made invalid picks`);
            }
        }
        else {
            ctx.response.body = html`<p style="color: red">an error occured</p>`;
            infoLog(`${ctx.request.ip} tried making meet picks, either unauthenticated to league, no current meet, or invalid form data`);
        }
    }
    catch(error) {
        ctx.response.status = Status.Teapot;
        ctx.response.body = "error";
        console.error(error);
        infoLog(`${ctx.request.ip} attempted to submit meet picks, possible invalid form data`)
    }
})

const scoringInformation = html`
<details>
    <summary>scoring information</summary>
    <p>
        <code>s = 100 * (p / f) ^ 10</code>
        <ul>
            <li>s = score</li>
            <li>p = previous time</li>
            <li>f = finish time</li>
        </ul>

        see <a href="https://www.desmos.com/calculator/se7klkmjx8">this desmos graph</a> for more details
        <br />
        <ul>
            <li>previous time based on season best</li>
            <li>if first race of season, previous time will be last season's best</li>
        </ul>
    </p>
</details>
`;

const rulesInformation = html`
<details>
    <summary>rules</summary>
    <ul>
        <li>every week, pick 3 unique athletes to score points for you</li>
        <li>athletes score points based on their previous best time (see more information about scoring below)</li>
        <li>points score by athletes you pick add up to your total</li>
        <li>whoever has the highest total by the end of the season wins</li>
    </ul>
</details>
`;

router.get("/:id", async ctx => {
    const query: (leagueTable & seasonTable)[] = await sql`SELECT league_name, season_name, seasons.season_id FROM leagues INNER JOIN seasons ON leagues.season_id = seasons.season_id WHERE league_id=${ctx.params.id};`;
    if (ctx.state.authenticated &&
        query.length > 0 &&
        ((await sql`SELECT FROM leaguemembers WHERE user_id = ${ctx.state.user_id} AND league_id = ${ctx.params.id}`) as [])
        .length > 0
    ) {
        ctx.response.body = page(`league: ${query[0].league_name}`,
            html`
                <a href="/leagues">back to leagues</a>
                <h2>${query[0].league_name}</h2>
                <p>season: ${query[0].season_name}</p>

                ${
                    await (async () => {
                        const currentMeetQuery: meetTable[] = await sql`SELECT meets.* FROM seasons INNER JOIN meets ON meets.meet_id = seasons.current_meet WHERE seasons.season_id = ${query[0].season_id};`;
                        const athletes: athleteTable[] = await sql`SELECT * from athletes WHERE season_id = ${query[0].season_id}`;

                        if (currentMeetQuery.length > 0) {
                            const currentMeetPicks: meetPicks[] = await sql`
                                SELECT * from meetpicks WHERE user_id = ${ctx.state.user_id}
                                AND meet_id = ${currentMeetQuery[0].meet_id};
                            `;

                            const athletePicker = (no: number) => html`
                            <label for="athlete-pick${no.toString()}">pick ${no.toString()}</label>
                            <select name="pick${no.toString()}" id="athlete-pick${no.toString()}">
                                <option value="null">(pick an athlete)</option>

                                ${athletes.map(athlete => html`
                                    <option value="${athlete.athlete_id.toString()}" ${currentMeetPicks.length > 0 && athlete.athlete_id == (currentMeetPicks[0] as any)[`pick${no}`] ? "selected" : ""}>${athlete.athlete_name}</option>
                                        `)}
                            </select>
                            `;

                            return html`
                            <details>
                                <summary>upcoming meet</summary>
                                <h3>${currentMeetQuery[0].meet_name}</h3>
                                <div id="pick-messenger"><p>make 3 unique picks for the upcoming meet</p></div>
                                <span id="meet-picker-loading" class="htmx-indicator">submitting...</span>
                                <form hx-post="/leagues/${ctx.params.id}/meetpicks" hx-target="#pick-messenger" hx-swap="innerHTML" hx-indicator="#meet-picker-loading">
                                    <fieldset>
                                        <legend>picks</legend>
                                        ${athletePicker(1)}
                                        ${athletePicker(2)}
                                        ${athletePicker(3)}
                                    </fieldset>

                                    <button type="submit">submit</button>
                                </form>
                            </details>
                            `;
                        }

                        return html``;
                    })()
                }

                <details>
                    <summary>league standings</summary>
                    ${
                        await (async () => {
                            const query_standings: standingsQuery[] = await sql`
                            WITH picks AS 
                            (
                                SELECT picks_id, user_id, COALESCE(race1.score, 0) score1, COALESCE(race2.score, 0) score2, COALESCE(race3.score, 0) score3 from meetpicks
                                LEFT JOIN races race1 ON meetpicks.pick1 = race1.athlete_id AND meetpicks.meet_id = race1.meet_id
                                LEFT JOIN races race2 ON meetpicks.pick2 = race2.athlete_id AND meetpicks.meet_id = race2.meet_id
                                LEFT JOIN races race3 ON meetpicks.pick3 = race3.athlete_id AND meetpicks.meet_id = race3.meet_id
                                WHERE meetpicks.league_id = ${ctx.params.id}
                            ),
                            scores as (
                                SELECT users.user_id, users.username, users.user_role,
                                COALESCE(SUM(picks.score1), 0) + COALESCE(SUM(picks.score2), 0) + COALESCE(SUM(picks.score3), 0) total_score 
                                FROM users
                                LEFT JOIN picks ON users.user_id = picks.user_id
                                WHERE users.user_id IN (SELECT user_id FROM leaguemembers WHERE league_id = ${ctx.params.id})
                                GROUP BY users.user_id
                                ORDER BY total_score DESC
                            )
                            SELECT scores.*,
                                rank() OVER (ORDER BY scores.total_score DESC) place
                            from scores;
                            ;
                            `;

                            if (query_standings.length > 0) {
                                return html`
                                <figure>
                                    <table>
                                        <caption>standings for ${query[0].league_name}</caption>
                                        <tr>
                                            <th>place</th>
                                            <th>username</th>
                                            <th>score</th>
                                        </tr>
                                        ${
                                            query_standings.map(user => 
                                                html`
                                                <tr>
                                                    <td class="${placeColorClass(user.place)}">
                                                    ${(user.place).toString()}</td>
                                                    <td>${user.username}${user.user_role == null ? "" : html` <mark class="role_${user.user_role}">${user.user_role}</mark>`}</td>
                                                    <td>${user.total_score.toFixed(2)}</td>
                                                </tr>
                                                `
                                            )
                                        }
                                    </table>
                                </figure>
                                `
                            }

                            return html`<p style="color: red">could not get league standings. please report this issue to rohan</p>`;
                        })()
                    }
                </details>
                <details>
                    <summary>athletes</summary>
                        ${
                            await (async () => {
                                const query_athletes: (athleteTable & scoreSelect)[] = await sql`
                                    WITH scores AS (SELECT athlete_id, SUM(races.score) total_score, AVG(races.score) avg_score FROM races GROUP BY athlete_id),
                                    athleteScores AS (
                                        SELECT athletes.athlete_id, athletes.athlete_name, athletes.athlete_year, athletes.sex, COALESCE(scores.total_score, 0) total_score, COALESCE(scores.avg_score, 0) avg_score FROM athletes
                                        LEFT JOIN scores ON athletes.athlete_id = scores.athlete_id
                                        WHERE athletes.season_id = ${query[0].season_id}
                                    )
                                    SELECT athleteScores.*, rank() OVER ( ORDER BY total_score DESC ) place
                                    FROM athleteScores;
                                `;

                                if (query_athletes.length > 0) {
                                    return html`
                                        <figure>
                                            <table>
                                                <tr>
                                                    <th>place</th>
                                                    <th>name</th>
                                                    <th>sex</th>
                                                    <th>year</th>
                                                    <th>avg.</th>
                                                    <th>total</th>
                                                </tr>
                                                ${
                                                    query_athletes.map(athlete => html`
                                                    <tr>
                                                        <td class="${placeColorClass(athlete.place)}">${(athlete.place).toString()}</td>
                                                        <td>${athlete.athlete_name}</td>
                                                        <td><mark class="${sexColorClass(athlete.sex)}">${athlete.sex}</mark></td>
                                                        <td>${athleteYear(athlete.athlete_year)}</td>
                                                        <td class="${scoreColorClass(athlete.avg_score)}">${athlete.avg_score.toFixed(2)}</td>
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

                        <div class="notice">
                            <label for="athlete-lookup">select an athlete to view in detail</label>
                            <select name="athlete_id" id="athlete-lookup" _="on change set #athlete-viewer's innerHTML to ''">
                                <option value="">(select an athlete)</option>

                                ${
                                    await (async () => {
                                        const queryAths: athleteTable[] = await sql`SELECT * FROM athletes WHERE season_id = ${query[0].season_id};`;
                                        
                                        if (queryAths.length > 0) {
                                            return queryAths.map(ath =>
                                                html`
                                                    <option value="${ath.athlete_id.toString()}">${ath.athlete_name}</option>
                                                `
                                            )
                                        }

                                        return html``
                                    })()
                                }
                            </select>
                            <button hx-post="/leagues/athleteinfo" hx-target="#athlete-viewer" hx-swap="innerHTML" hx-include="#athlete-lookup" hx-indicator="#athlete-viewer-loading">view athlete detailed stats</button>
                            <span id="athlete-viewer-loading" class="htmx-indicator">loading...</span>
                            <div id="athlete-viewer"></div>
                        </div>
                </details>

                <details>
                        <summary>meets</summary>
                        <label for="meet-lookup">select a meet to view</label>

                        <select name="meet_id" id="meet-lookup" _="on change set #meet-viewer's innerHTML to ''">
                            <option value="">(select a meet)</option>

                            ${
                                await (async () => {
                                    const queryMeets: meetTable[] = await sql`SELECT meet_id, meet_name FROM meets WHERE season_id = ${query[0].season_id};`;
                                    
                                    if (queryMeets.length > 0) {
                                        return queryMeets.map(meet =>
                                            html`
                                                <option value="${meet.meet_id.toString()}">${meet.meet_name}</option>
                                            `
                                        )
                                    }

                                    return html``
                                })()
                            }
                        </select>
                        <button hx-post="/leagues/meetinfo" hx-target="#meet-viewer" hx-swap="innerHTML" hx-include="#meet-lookup" hx-indicator="#meet-viewer-loading"> view meet stats</button>
                        <span id="meet-viewer-loading" class="htmx-indicator">loading...</span>
                        <div id="meet-viewer"></div>
                </details>

                ${rulesInformation}
                ${scoringInformation}
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
        const query: leagueTable[] = await sql`SELECT * from leagues WHERE league_id=${ctx.params.id} AND joinable=TRUE;`;
        if (query.length > 0
            && (await sql`SELECT from leaguemembers WHERE user_id = ${ctx.state.user_id} AND league_id = ${ctx.params.id}`).length == 0) {
                await sql`INSERT INTO leaguemembers (user_id, league_id) VALUES (${ctx.state.user_id}, ${ctx.params.id})`;
        }
        ctx.response.status = Status.SeeOther;
        ctx.response.headers.set("Location", "/leagues");
        infoLog(`"${ctx.state.username}" (${ctx.request.ip}) joined league "${query[0].league_name}", welcome!`);
    }
    else {
        ctx.response.status = Status.SeeOther;
        ctx.response.headers.set("Location", "/");
        infoLog(`${ctx.request.ip} tried joining a league, either unauthenticated, or invalid league`);
    }
});

export default router;

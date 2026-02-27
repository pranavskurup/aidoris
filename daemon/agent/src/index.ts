import openapi from '@elysiajs/openapi'
import { Elysia, t } from 'elysia'

// OpenAPI documentation is available at `/openapi` (UI) and `/openapi/json` (spec).
const app = new Elysia()
    .use(openapi())
    .get('/', () => 'Aidoris Agent is running', {
        detail: {
            tags: ['root']
        },
        response: {
            200: t.String({
                default: 'Aidoris Agent is running',
                description: 'Root endpoint, with default response "Aidoris Agent is running"'
            })
        }
    })
    .listen(4101)

console.log(
    `🦊 Aidoris Agent is running at http://${app.server?.hostname}:${app.server?.port} (OpenAPI docs at /openapi)`
)
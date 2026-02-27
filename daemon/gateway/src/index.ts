import openapi from '@elysiajs/openapi'
import { Elysia, t } from 'elysia'

// OpenAPI documentation is available at `/openapi` (UI) and `/openapi/json` (spec).
const app = new Elysia()
    .use(openapi())
    .get('/', () => 'Aidoris Gateway is running', {
        detail: {
            tags: ['root']
        },
        response: {
            200: t.String({
                default: 'Aidoris Gateway is running',
                description: 'Root endpoint, with default response "Aidoris Gateway is running"'
            })
        }
    })
    .listen(3000)

console.log(
    `🦊 Aidoris Gateway is running at http://${app.server?.hostname}:${app.server?.port} (OpenAPI docs at /openapi)`
)
// prisma.config.ts
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const directUrl = process.env.DIRECT_URL

if (!directUrl) {
  throw new Error('DIRECT_URL is required in .env file')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: directUrl,
  },
})
        
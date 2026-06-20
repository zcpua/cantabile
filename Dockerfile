FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN bun install
COPY . .
RUN bunx tsup --config tsup.config.ts

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["bun", "dist/node.mjs"]

# Runtime image built from a standalone output produced on the host:
#
#   npm run build:docker        (or build:docker:disk)
#   docker compose up -d --build
#
# Why not `npm install` + `next build` inside Docker? On this machine, HTTPS
# from inside containers to registry.npmjs.org fails certificate checks, so
# the build happens on the host where npm works. The app has no native
# modules, so the output runs the same on Linux.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

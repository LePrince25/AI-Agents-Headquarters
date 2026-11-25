FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g --omit=dev @anthropic-ai/claude-code

USER node
WORKDIR /app

ENV HOTE=0.0.0.0
ENV PROJETS_DIR=/projets

COPY --chown=node:node . .

EXPOSE 4173
CMD ["node", "live/server.js"]

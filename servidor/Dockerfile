FROM node:24-alpine
RUN mkdir -p /data && chown node:node /data
WORKDIR /app
COPY server.js .
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/salud || exit 1
CMD ["node", "server.js"]

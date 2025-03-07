FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Copy source code, config and pre-built artifacts
COPY src/ ./src/
COPY tsconfig.json ./
COPY artifacts/ ./artifacts/

# Build TypeScript
RUN npx tsc

# Create a non-root user
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

CMD ["npm", "start"]
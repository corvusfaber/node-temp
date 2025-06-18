# ---------- Stage 1: Build ----------
FROM node:18-alpine AS builder

# Set up working directory
WORKDIR /app

# Copy only package files and install dependencies (cache-friendly)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# ---------- Stage 2: Runtime ----------
FROM node:18-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy only production-ready app from builder stage
COPY --from=builder /app .

# Change the ownership 
RUN chown -R appuser:appgroup /app

# Use non-root user
USER appuser

# Expose the app port
EXPOSE 3000

# Run the app
CMD ["node", "index.js"]

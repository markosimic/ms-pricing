FROM node:22

# Standard libraries are included, but we ensure openssl is current
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install dependencies inside the container to ensure architecture match
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate the engine
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

# Standalone output does NOT include static assets — copy them in manually
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]

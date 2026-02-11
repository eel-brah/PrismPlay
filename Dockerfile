# Build stage
FROM node:20-alpine as builder

WORKDIR /ft_transcendence

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate

RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /ft_transcendence

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY prisma ./prisma

RUN pnpm prisma generate

COPY src ./src

COPY --from=builder /ft_transcendence/dist ./dist

RUN mkdir -p uploads data

EXPOSE 9443 9000

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
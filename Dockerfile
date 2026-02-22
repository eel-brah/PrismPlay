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

# add openssl for cert generation
RUN apk add --no-cache openssl

RUN pnpm install --prod --frozen-lockfile

COPY prisma ./prisma

RUN pnpm prisma generate

COPY src ./src


COPY uploads ./uploads

COPY --from=builder /ft_transcendence/dist ./dist

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x /ft_transcendence/entrypoint.sh

EXPOSE 9443 9000

ENTRYPOINT [ "/ft_transcendence/entrypoint.sh" ]
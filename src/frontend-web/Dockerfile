FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_STORE_API_BASE_URL=http://localhost:8080/api/v1
ARG VITE_ACCOUNT_API_BASE_URL=http://localhost:8081
ARG VITE_SUPPORT_API_BASE_URL=http://localhost:8082
ENV VITE_STORE_API_BASE_URL=$VITE_STORE_API_BASE_URL
ENV VITE_ACCOUNT_API_BASE_URL=$VITE_ACCOUNT_API_BASE_URL
ENV VITE_SUPPORT_API_BASE_URL=$VITE_SUPPORT_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

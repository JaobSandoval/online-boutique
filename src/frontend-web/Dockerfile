FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Rutas relativas: el nginx de este mismo contenedor las reenvia a cada
# servicio (ver nginx.conf). Asi la imagen funciona en cualquier URL publica.
ARG VITE_STORE_API_BASE_URL=/api/v1
ARG VITE_ACCOUNT_API_BASE_URL=/account
ARG VITE_SUPPORT_API_BASE_URL=/support
ENV VITE_STORE_API_BASE_URL=$VITE_STORE_API_BASE_URL
ENV VITE_ACCOUNT_API_BASE_URL=$VITE_ACCOUNT_API_BASE_URL
ENV VITE_SUPPORT_API_BASE_URL=$VITE_SUPPORT_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ARG VITE_BASE=/dev/gemcafe/
ENV VITE_BASE=$VITE_BASE
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
ARG VITE_BASE=/dev/gemcafe/
COPY nginx-fe.conf /etc/nginx/conf.d/default.conf.template
RUN sed -i "s|VITE_BASE_PLACEHOLDER|${VITE_BASE}|g" /etc/nginx/conf.d/default.conf.template \
    && mv /etc/nginx/conf.d/default.conf.template /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
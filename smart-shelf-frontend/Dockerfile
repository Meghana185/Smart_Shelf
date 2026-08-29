# Stage 1: Build static assets with Node.js
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Accept build-time environment variable for the backend API URL
ARG VITE_API_BASE_URL=https://smart-shelf-backend-79li.onrender.com/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# Stage 2: Serve static files with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

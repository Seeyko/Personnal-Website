FROM nginx:alpine AS production

# Build arguments for environment-specific config
ARG API_URL=https://api.tomandrieu.com
ARG FRONTEND_URL=https://tomandrieu.com

# Copy nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy frontend static files
COPY frontend/assets/ /usr/share/nginx/html/assets/
COPY frontend/css/ /usr/share/nginx/html/css/
COPY frontend/data/ /usr/share/nginx/html/data/
COPY frontend/js/ /usr/share/nginx/html/js/
COPY frontend/themes/ /usr/share/nginx/html/themes/
COPY frontend/i18n/ /usr/share/nginx/html/i18n/
COPY frontend/index.html /usr/share/nginx/html/
COPY frontend/blog.html /usr/share/nginx/html/
COPY frontend/admin.html /usr/share/nginx/html/

# Copy config template and generate config.js with environment variables
COPY frontend/config.template.js /tmp/config.template.js
RUN envsubst '${API_URL} ${FRONTEND_URL}' < /tmp/config.template.js > /usr/share/nginx/html/config.js && \
    rm /tmp/config.template.js

EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]

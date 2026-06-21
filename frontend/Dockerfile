FROM nginx:alpine AS production

# Build arguments for environment-specific config
ARG API_URL=https://api.tomandrieu.com
ARG FRONTEND_URL=https://tomandrieu.com
ARG ADMIN_SECRET_PATH=_mx9k7

# Copy nginx config template and inject ADMIN_SECRET_PATH
COPY nginx/default.conf /tmp/default.conf.template
RUN envsubst '${ADMIN_SECRET_PATH}' < /tmp/default.conf.template > /etc/nginx/conf.d/default.conf && \
    rm /tmp/default.conf.template

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
COPY frontend/experiments/ /usr/share/nginx/html/experiments/

# Copy config template and generate config.js with environment variables
COPY frontend/config.template.js /tmp/config.template.js
RUN envsubst '${API_URL} ${FRONTEND_URL} ${ADMIN_SECRET_PATH}' < /tmp/config.template.js > /usr/share/nginx/html/config.js && \
    rm /tmp/config.template.js

EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]

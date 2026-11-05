FROM nginx:alpine
COPY index.html css /usr/share/nginx/html
COPY js /usr/share/nginx/html/js
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80

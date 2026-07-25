#!/bin/sh
# Health check script for Nginx
wget --no-verbose --tries=1 --spider http://localhost:80/index.html || exit 1

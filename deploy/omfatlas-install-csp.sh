#!/usr/bin/env bash
# Insert the site's security headers into the live vhost.
#
# The vhost in the repo is HTTP only on purpose, because certbot rewrote the
# installed file in place to add the TLS block. Copying the repo file over it
# would take the certificate configuration with it, so this inserts only the
# header lines into the block certbot produced, and does nothing if they are
# already there.
set -euo pipefail
VHOST=/etc/nginx/sites-available/omfatlas.xera.ac
SNIPPET="$(dirname "$0")/omfatlas-headers.conf"

[ -f "$VHOST" ] || { echo "No vhost at $VHOST"; exit 1; }
[ -f "$SNIPPET" ] || { echo "No snippet at $SNIPPET"; exit 1; }

if grep -q "googletagmanager.com" "$VHOST"; then
    echo "Headers already present; nothing to do."
    exit 0
fi

BACKUP="$VHOST.bak.$(date +%Y%m%d%H%M%S)"
cp "$VHOST" "$BACKUP"
echo "Backed up to $BACKUP"

# Insert after the first server_name line, which is inside the TLS server block.
awk -v snippet="$SNIPPET" '
    !done && /^[[:space:]]*server_name[[:space:]]+omfatlas\.xera\.ac;/ {
        print
        while ((getline line < snippet) > 0) print line
        close(snippet)
        done = 1
        next
    }
    { print }
' "$VHOST" > "$VHOST.new"

mv "$VHOST.new" "$VHOST"

if nginx -t; then
    systemctl reload nginx
    echo "Installed and reloaded."
else
    echo "nginx rejected the config; restoring the backup." >&2
    cp "$BACKUP" "$VHOST"
    nginx -t
    exit 1
fi

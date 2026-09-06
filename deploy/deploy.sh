#!/usr/bin/env bash
# Build and publish OMF Atlas on the xera.ac box. Run from a checkout on the
# server, as the xeradb user:
#
#   cd /var/www/omfatlas && git pull && ./deploy/deploy.sh
#
# The nginx vhost and TLS certificate are installed once by hand; see the
# header of deploy/omfatlas.xera.ac.nginx for those root-only commands.
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci --no-audit --no-fund
npm test
npm run build

# Pre-compress the anatomy binaries for nginx gzip_static. These are the bulk
# of the payload and they never change between requests, so compressing them
# once at deploy time is much cheaper than doing it per request.
find dist/models -type f \( -name '*.bin' -o -name '*.json' \) -print0 |
    xargs -0 -P 4 -I {} gzip -9 -k -f {}

cp deploy/omfatlas.xera.ac.nginx ~/omfatlas.xera.ac.nginx
cp deploy/omfatlas-headers.conf deploy/omfatlas-install-csp.sh ~/

echo "Built $(du -sh dist | cut -f1) into dist/. nginx serves it directly; no reload needed for content changes."

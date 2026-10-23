#!/bin/sh
set -e

# If starting the main WMS API service, perform database schema sync and initial seeding
if [ "$1" = "npm" ] && [ "$2" = "run" ] && [ "$3" = "start" ] || [ "$1" = "node" ] && [ "$2" = "dist/src/index.js" ]; then
    echo "=========================================================="
    echo "🚀 Initializing WMS & Procurement System (Docker Mode)..."
    echo "=========================================================="

    if [ "$AUTO_MIGRATE" != "false" ]; then
        echo "🔄 Synchronizing database schema with PostgreSQL (prisma db push)..."
        npx prisma db push --skip-generate || {
            echo "⚠️ Warning: prisma db push encountered an issue, retrying in 3 seconds..."
            sleep 3
            npx prisma db push --skip-generate
        }
    fi

    if [ "$AUTO_SEED" != "false" ]; then
        echo "🌱 Ensuring initial seed data (Roles, Users, Inventory, Customers)..."
        node dist/src/scripts/seedInitialData.js || echo "ℹ️ Seeding skipped or already populated."
    fi

    echo "✅ Database readiness verified. Launching WMS API Server..."
    echo "=========================================================="
fi

exec "$@"

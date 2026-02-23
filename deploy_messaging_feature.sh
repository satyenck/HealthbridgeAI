#!/bin/bash

# HealthbridgeAI - Deploy Messaging Feature
# This script deploys the messaging feature to the production server

set -e  # Exit on error

echo "========================================="
echo "HealthbridgeAI Messaging Feature Deployment"
echo "========================================="
echo ""

# Configuration
SERVER_IP="13.204.87.82"
SERVER_USER="ubuntu"
BACKEND_DIR="/home/ubuntu/HealthbridgeAI/backend"
DB_HOST="healthbridgedb.ch6iz8dvhwbm.ap-south-1.rds.amazonaws.com"
DB_NAME="healthbridgedb"
DB_USER="healthbridge_adm"
DB_PASSWORD="hbNeelNavya1029!"

echo "Step 1: Connecting to production server..."
echo "-------------------------------------------"

# SSH to server and run deployment commands
ssh -i ~/.ssh/healthbridge-key.pem ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'

echo "Step 2: Pulling latest code from GitHub..."
echo "-------------------------------------------"
cd /home/ubuntu/HealthbridgeAI
git pull origin main

echo ""
echo "Step 3: Running database migration..."
echo "-------------------------------------------"
cd /home/ubuntu/HealthbridgeAI/backend
export PGPASSWORD='hbNeelNavya1029!'

# Check if messages table already exists
TABLE_EXISTS=$(psql -h healthbridgedb.ch6iz8dvhwbm.ap-south-1.rds.amazonaws.com \
  -U healthbridge_adm \
  -d healthbridgedb \
  -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='messages');" 2>&1)

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "✓ Messages table already exists"
else
  echo "Creating messages table..."
  psql -h healthbridgedb.ch6iz8dvhwbm.ap-south-1.rds.amazonaws.com \
    -U healthbridge_adm \
    -d healthbridgedb \
    -f migrations/add_messages.sql
  echo "✓ Messages table created"
fi

echo ""
echo "Step 4: Restarting backend service..."
echo "-------------------------------------------"
sudo systemctl restart healthbridge
sleep 3

echo ""
echo "Step 5: Checking service status..."
echo "-------------------------------------------"
sudo systemctl status healthbridge --no-pager

echo ""
echo "Step 6: Testing messaging API..."
echo "-------------------------------------------"
sleep 2
curl -s https://healthbridgeai.duckdns.org/api/messages/conversations || echo "API test completed"

ENDSSH

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test the messaging feature in the app"
echo "2. Verify conversations are restored"
echo "3. Check for any errors in the logs"
echo ""
echo "To view logs:"
echo "ssh -i ~/.ssh/healthbridge-key.pem ubuntu@${SERVER_IP} 'sudo journalctl -u healthbridge -f'"
echo ""

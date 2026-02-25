#!/bin/bash

# ============================================================================
# Deploy Referral System to Production
# ============================================================================

set -e  # Exit on error

echo "=================================================="
echo "HealthbridgeAI - Referral System Deployment"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="healthbridge-db.cjsxbokc6yxc.ap-south-1.rds.amazonaws.com"
DB_USER="postgres"
DB_NAME="healthbridgeai_db"
DB_PASSWORD="hbNeelNavya1029!"

echo -e "${YELLOW}Step 1: Pull latest code from GitHub${NC}"
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

echo -e "${YELLOW}Step 2: Run database migration${NC}"
echo "Creating referrals table..."

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f backend/migrations/add_referrals.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migration completed successfully${NC}"
else
    echo -e "${RED}✗ Database migration failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 3: Verify referrals table created${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\d referrals" | head -20

echo ""
echo -e "${YELLOW}Step 4: Restart backend service${NC}"
sudo systemctl restart healthbridgeai-backend
sleep 3

echo ""
echo -e "${YELLOW}Step 5: Check backend status${NC}"
sudo systemctl status healthbridgeai-backend --no-pager | head -15

echo ""
echo -e "${YELLOW}Step 6: Test API endpoint${NC}"
echo "Testing /api/health endpoint..."
curl -s https://healthbridgeai.duckdns.org/api/health | head -5

echo ""
echo ""
echo -e "${GREEN}=================================================="
echo "Deployment Complete!"
echo "==================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test referral creation via app or web"
echo "2. Check logs: sudo journalctl -u healthbridgeai-backend -f"
echo "3. Monitor for any errors"
echo ""
echo "Referral API Endpoints:"
echo "  POST   /api/referrals/"
echo "  GET    /api/referrals/my-referrals-made"
echo "  GET    /api/referrals/my-referrals-received"
echo "  GET    /api/referrals/my-referrals"
echo "  PATCH  /api/referrals/{id}/accept"
echo "  PATCH  /api/referrals/{id}/decline"
echo ""

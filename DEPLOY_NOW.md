# 🚀 Deploy Referral System NOW

## Quick Deployment (5 minutes)

### Option 1: Run Automated Script

**On your local machine:**
```bash
# Copy deployment script to server
scp deploy-referral-system.sh ubuntu@13.204.87.82:/home/ubuntu/HealthbridgeAI/

# SSH to server and run
ssh ubuntu@13.204.87.82
cd /home/ubuntu/HealthbridgeAI
./deploy-referral-system.sh
```

---

### Option 2: Manual Deployment (Step by Step)

**SSH to production server:**
```bash
ssh ubuntu@13.204.87.82
```

**Step 1: Pull latest code**
```bash
cd /home/ubuntu/HealthbridgeAI
git pull origin main
```

**Step 2: Run database migration**
```bash
PGPASSWORD='hbNeelNavya1029!' psql \
  -h healthbridge-db.cjsxbokc6yxc.ap-south-1.rds.amazonaws.com \
  -U postgres \
  -d healthbridgeai_db \
  -f backend/migrations/add_referrals.sql
```

**Step 3: Verify table created**
```bash
PGPASSWORD='hbNeelNavya1029!' psql \
  -h healthbridge-db.cjsxbokc6yxc.ap-south-1.rds.amazonaws.com \
  -U postgres \
  -d healthbridgeai_db \
  -c "\d referrals"
```

**Step 4: Restart backend**
```bash
sudo systemctl restart healthbridgeai-backend
sudo systemctl status healthbridgeai-backend
```

**Step 5: Check logs**
```bash
sudo journalctl -u healthbridgeai-backend -n 50 --no-pager
```

---

## Verification

**Test API is working:**
```bash
curl https://healthbridgeai.duckdns.org/api/health
```

**Test with your doctor token:**
```bash
TOKEN="your_doctor_token_here"
curl https://healthbridgeai.duckdns.org/api/referrals/my-referrals-received \
  -H "Authorization: Bearer $TOKEN"
```

---

## What Will Happen

✅ New `referrals` table created in database
✅ Backend restarted with new referral endpoints
✅ New "Referrals" tab appears in doctor mobile app
✅ Doctors can create and manage referrals
✅ Patients can view their referrals
✅ All existing features continue to work

---

## Rollback (if needed)

If something goes wrong:
```bash
# Drop referrals table
PGPASSWORD='hbNeelNavya1029!' psql \
  -h healthbridge-db.cjsxbokc6yxc.ap-south-1.rds.amazonaws.com \
  -U postgres \
  -d healthbridgeai_db \
  -c "DROP TABLE IF EXISTS referrals CASCADE;"

# Revert to previous version
git reset --hard 286225b
sudo systemctl restart healthbridgeai-backend
```

---

## After Deployment

1. **Test on Mobile:**
   - Login as doctor
   - See new "Referrals" tab
   - Try creating a referral

2. **Test on Web:**
   - Login at https://healthbridgeai.duckdns.org
   - Navigate to referrals section

3. **Monitor Logs:**
   ```bash
   sudo journalctl -u healthbridgeai-backend -f
   ```

---

## Need Help?

Check logs if errors occur:
```bash
# Backend logs
sudo journalctl -u healthbridgeai-backend -n 100

# Database connection test
PGPASSWORD='hbNeelNavya1029!' psql \
  -h healthbridge-db.cjsxbokc6yxc.ap-south-1.rds.amazonaws.com \
  -U postgres \
  -d healthbridgeai_db \
  -c "SELECT version();"
```

🎉 **You're ready to deploy!**

# AWS Deployment Guide - HealthbridgeAI Backend

## Overview
This guide will help you deploy the HealthbridgeAI FastAPI backend to AWS, making it accessible from anywhere in the world.

## Architecture
- **AWS RDS** - PostgreSQL database
- **AWS EC2** - Ubuntu server running FastAPI with Uvicorn
- **AWS S3** - Media storage (uploads)
- **Nginx** - Reverse proxy and SSL termination
- **Certbot** - Free SSL certificates via Let's Encrypt

---

## Prerequisites

1. **AWS Account** - Create at https://aws.amazon.com
2. **Domain Name** (recommended) - e.g., api.healthbridgeai.com
3. **API Keys Ready**:
   - Gemini API Key
   - Twilio credentials (optional, for SMS)
   - Google OAuth credentials (optional)
   - Agora credentials (optional, for video calls)

---

## Phase 1: Database Setup (AWS RDS)

### 1.1 Create RDS PostgreSQL Instance

1. **Go to AWS RDS Console**
   - Navigate to: https://console.aws.amazon.com/rds/

2. **Click "Create database"**

3. **Choose settings:**
   ```
   Engine: PostgreSQL
   Version: PostgreSQL 15.x or later
   Templates: Free tier (for testing) OR Production (recommended)

   DB instance identifier: healthbridge-db
   Master username: healthbridge_admin
   Master password: [CREATE STRONG PASSWORD - SAVE IT!]

   DB instance class:
     - Free tier: db.t3.micro
     - Production: db.t3.small or larger

   Storage: 20 GB (can auto-scale)

   VPC: Default VPC
   Public access: Yes (we'll secure it with security groups)

   Database name: healthbridge_db
   ```

4. **Click "Create database"**
   - Wait 5-10 minutes for creation
   - **Save the endpoint URL** (e.g., `healthbridge-db.xxxxx.us-east-1.rds.amazonaws.com`)

### 1.2 Configure Security Group

1. **Click on the DB instance**
2. **Go to "Connectivity & security" tab**
3. **Click on the security group**
4. **Edit inbound rules:**
   ```
   Type: PostgreSQL
   Port: 5432
   Source: Custom (we'll add EC2 security group later)
   Description: Allow from EC2 instance
   ```

---

## Phase 2: EC2 Server Setup

### 2.1 Launch EC2 Instance

1. **Go to EC2 Console**
   - Navigate to: https://console.aws.amazon.com/ec2/

2. **Click "Launch Instance"**

3. **Configure:**
   ```
   Name: healthbridge-backend

   AMI: Ubuntu Server 22.04 LTS

   Instance type:
     - Testing: t2.micro (free tier)
     - Production: t2.small or t3.small

   Key pair: Create new key pair
     Name: healthbridge-key
     Type: RSA
     Format: .pem
     DOWNLOAD AND SAVE THIS FILE!

   Network settings:
     - Allow SSH (port 22) from your IP
     - Allow HTTP (port 80) from anywhere
     - Allow HTTPS (port 443) from anywhere

   Storage: 20 GB gp3
   ```

4. **Click "Launch instance"**

5. **Save the Public IP address** (e.g., `54.123.45.67`)

### 2.2 Update Security Groups

1. **Note the EC2 security group ID** (e.g., `sg-xxxxx`)
2. **Go back to RDS security group**
3. **Edit inbound rule for PostgreSQL:**
   ```
   Source: Custom → Select EC2 security group (sg-xxxxx)
   ```

---

## Phase 3: Server Configuration

### 3.1 Connect to EC2 Instance

On your Mac terminal:
```bash
# Set permissions on key file
chmod 400 ~/Downloads/healthbridge-key.pem

# Connect to EC2
ssh -i ~/Downloads/healthbridge-key.pem ubuntu@54.123.45.67
```
*(Replace with your actual IP address)*

### 3.2 Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install Git
sudo apt install -y git
```

### 3.3 Setup Application

```bash
# Create app directory
sudo mkdir -p /var/www/healthbridge
sudo chown ubuntu:ubuntu /var/www/healthbridge
cd /var/www/healthbridge

# Clone repository
git clone https://github.com/satyenck/HealthbridgeAI.git .

# Create virtual environment
cd backend
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

### 3.4 Configure Environment Variables

```bash
# Create production .env file
nano .env
```

**Copy and modify this template:**
```bash
# Database (use RDS endpoint)
DATABASE_URL=postgresql://healthbridge_admin:YOUR_RDS_PASSWORD@healthbridge-db.xxxxx.us-east-1.rds.amazonaws.com:5432/healthbridge_db

# JWT Secret (generate a strong random key)
SECRET_KEY=GENERATE_RANDOM_SECRET_HERE_USE_openssl_rand_-hex_32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Google Gemini AI API
GEMINI_API_KEY=your-actual-gemini-api-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Twilio (optional - for SMS)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Agora (optional - for video)
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate

# App Settings
APP_NAME=HealthbridgeAI
DEBUG=False
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Generate SECRET_KEY:**
```bash
openssl rand -hex 32
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### 3.5 Initialize Database

```bash
# Run migrations
alembic upgrade head
```

---

## Phase 4: Setup Systemd Service

### 4.1 Create Service File

```bash
sudo nano /etc/systemd/system/healthbridge.service
```

**Paste this:**
```ini
[Unit]
Description=HealthbridgeAI FastAPI Application
After=network.target

[Service]
Type=notify
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/healthbridge/backend
Environment="PATH=/var/www/healthbridge/backend/venv/bin"
ExecStart=/var/www/healthbridge/backend/venv/bin/gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 127.0.0.1:8000 --timeout 120 app.main:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**Save and exit**

### 4.2 Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable healthbridge

# Start service
sudo systemctl start healthbridge

# Check status
sudo systemctl status healthbridge

# View logs
sudo journalctl -u healthbridge -f
```

---

## Phase 5: Configure Nginx

### 5.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/healthbridge
```

**Paste this (replace yourdomain.com):**
```nginx
server {
    listen 80;
    server_name api.healthbridgeai.com;  # Replace with your domain

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**Save and exit**

### 5.2 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/healthbridge /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Phase 6: Setup SSL (HTTPS)

### 6.1 Configure DNS

**Before running Certbot, you MUST:**

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add an **A record**:
   ```
   Type: A
   Name: api (or your subdomain)
   Value: 54.123.45.67 (your EC2 public IP)
   TTL: 300
   ```
3. Wait 5-10 minutes for DNS propagation

**Verify DNS:**
```bash
nslookup api.healthbridgeai.com
# Should return your EC2 IP address
```

### 6.2 Get SSL Certificate

```bash
# Run Certbot
sudo certbot --nginx -d api.healthbridgeai.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)
```

**Certbot will automatically:**
- Get SSL certificate
- Modify Nginx config
- Setup auto-renewal

### 6.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Phase 7: Create Uploads Directory

```bash
# Create uploads directory
sudo mkdir -p /var/www/healthbridge/backend/uploads
sudo chown -R ubuntu:ubuntu /var/www/healthbridge/backend/uploads

# Restart service
sudo systemctl restart healthbridge
```

---

## Phase 8: Update Frontend Configuration

### 8.1 Update Mobile Apps

Edit `/frontend/src/config/api.ts`:

```typescript
import { Platform } from 'react-native';

const getDevBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const API_CONFIG = {
  BASE_URL: __DEV__
    ? getDevBaseUrl()
    : 'https://api.healthbridgeai.com',  // YOUR PRODUCTION URL
  TIMEOUT: 90000,
};
```

### 8.2 Update Web App

Edit `/web/src/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.PROD
  ? 'https://api.healthbridgeai.com'  // YOUR PRODUCTION URL
  : 'http://localhost:8000';
```

### 8.3 Update Backend CORS

Edit `/backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev
        "http://localhost:3000",  # Alternative dev port
        "https://yourdomain.com",  # Your production frontend domain
        "https://www.yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Phase 9: Testing

### 9.1 Test API Endpoints

```bash
# Test health check
curl https://api.healthbridgeai.com/health

# Should return: {"status":"healthy"}
```

### 9.2 Test from Mobile Apps

1. **Rebuild mobile apps** with production API URL
2. **Test login** with phone number
3. **Create encounter** and verify data saves

### 9.3 Test from Web Browser

1. Visit your web app
2. Login and test all features

---

## Phase 10: Monitoring and Maintenance

### 10.1 View Logs

```bash
# Application logs
sudo journalctl -u healthbridge -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 10.2 Restart Services

```bash
# Restart FastAPI app
sudo systemctl restart healthbridge

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status healthbridge
sudo systemctl status nginx
```

### 10.3 Update Application

```bash
cd /var/www/healthbridge
git pull origin main

cd backend
source venv/bin/activate
pip install -r requirements.txt

# Run any new migrations
alembic upgrade head

# Restart service
sudo systemctl restart healthbridge
```

---

## Security Checklist

- [ ] RDS security group only allows EC2
- [ ] EC2 security group restricts SSH to your IP
- [ ] SSL certificate installed (HTTPS)
- [ ] DEBUG=False in production .env
- [ ] Strong SECRET_KEY generated
- [ ] Strong database password
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Firewall configured (UFW)
- [ ] Backup strategy for database

---

## Optional Enhancements

### Setup UFW Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### Setup Database Backups

```bash
# Create backup script
nano ~/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/db-backups"
mkdir -p $BACKUP_DIR

PGPASSWORD=YOUR_RDS_PASSWORD pg_dump \
  -h healthbridge-db.xxxxx.us-east-1.rds.amazonaws.com \
  -U healthbridge_admin \
  -d healthbridge_db \
  -F c \
  -f $BACKUP_DIR/backup_$DATE.dump

# Keep only last 7 days
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
```

```bash
chmod +x ~/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

---

## Troubleshooting

### Can't connect to database
```bash
# Test connection from EC2
PGPASSWORD=your_password psql \
  -h healthbridge-db.xxxxx.us-east-1.rds.amazonaws.com \
  -U healthbridge_admin \
  -d healthbridge_db
```

### Application not starting
```bash
# Check logs
sudo journalctl -u healthbridge -n 100

# Check if port is in use
sudo lsof -i :8000
```

### SSL certificate issues
```bash
# Renew manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## Cost Estimate (Monthly)

**Free Tier (First 12 months):**
- EC2 t2.micro: Free
- RDS db.t3.micro: Free (750 hours/month)
- Data transfer: 15 GB free
- **Total: ~$0/month**

**After Free Tier:**
- EC2 t3.small: ~$15/month
- RDS db.t3.small: ~$25/month
- Data transfer: ~$5/month
- **Total: ~$45/month**

**Production (Recommended):**
- EC2 t3.medium: ~$30/month
- RDS db.t3.medium: ~$60/month
- Load Balancer (optional): ~$20/month
- Data transfer: ~$10/month
- **Total: ~$120/month**

---

## Next Steps

1. **Complete this deployment**
2. **Test thoroughly**
3. **Setup monitoring** (CloudWatch, Sentry)
4. **Configure backups**
5. **Setup CI/CD** (GitHub Actions)
6. **Consider scaling** (Load Balancer, Auto Scaling)

---

## Support

If you encounter issues:
1. Check application logs: `sudo journalctl -u healthbridge -f`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify security groups in AWS Console
4. Test database connectivity from EC2

---

**Created:** January 2026
**Version:** 1.0.0

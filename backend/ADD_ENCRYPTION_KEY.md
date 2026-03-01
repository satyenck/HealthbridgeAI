# Add Encryption Key to Production Server

The patient document upload feature requires an `ENCRYPTION_KEY` environment variable on the production server.

## Steps to Fix:

### Option 1: SSH into the server and add the key

```bash
# SSH into your production server
ssh ubuntu@healthbridgeai.duckdns.org

# Add the encryption key to the .env file
echo 'ENCRYPTION_KEY=uBxRt26SM_R_Fvcp-njg9-b-3VjFOt0V2BNu_5yOAWU=' | sudo tee -a /home/ubuntu/healthbridge/.env

# Restart the backend service to apply changes
sudo systemctl restart healthbridge-backend

# Verify the service is running
sudo systemctl status healthbridge-backend
```

### Option 2: Use AWS Systems Manager Session Manager

If you have AWS SSM configured:

```bash
# Start SSM session
aws ssm start-session --target <your-instance-id>

# Then run the same commands as Option 1
```

## Verify It Works

After adding the key and restarting the service, try uploading a PDF document from the Android emulator again.

The encryption key is used to encrypt file paths before storing them in the database (HIPAA compliance requirement).

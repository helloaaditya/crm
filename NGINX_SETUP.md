# Nginx Configuration for APK Uploads

## Problem
Getting `413 Request Entity Too Large` error when uploading APK files, even small ones (4.46MB).

## Solution
Update nginx configuration to allow larger file uploads.

## Quick Fix

### Step 1: Find your nginx config file

SSH into your server and find the nginx config:

```bash
# Find nginx config location
sudo nginx -t

# Usually located at:
/etc/nginx/sites-available/prod.sanjanawaterproofing.com
# or
/etc/nginx/nginx.conf
```

### Step 2: Edit nginx configuration

```bash
sudo nano /etc/nginx/sites-available/prod.sanjanawaterproofing.com
```

### Step 3: Add these lines inside the `server` block:

```nginx
server {
    # ... existing config ...
    
    # Increase client max body size for APK uploads (150MB)
    client_max_body_size 150M;
    
    # Increase buffer sizes for large uploads
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
    
    # Increase timeouts for large file uploads
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    # ... rest of config ...
}
```

### Step 4: Also update main nginx.conf (if needed)

```bash
sudo nano /etc/nginx/nginx.conf
```

Add inside `http` block:

```nginx
http {
    # ... existing config ...
    
    client_max_body_size 150M;
    
    # ... rest of config ...
}
```

### Step 5: Test and reload nginx

```bash
# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
# or
sudo service nginx reload
```

## Complete Example Configuration

See `nginx.conf.example` file in the repository for a complete nginx configuration.

## Verify It Works

After updating nginx:
1. Try uploading the APK file again
2. Check nginx error logs if still having issues:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

## Alternative: Quick Fix via Command Line

If you just want to quickly increase the limit:

```bash
# Add to main nginx.conf
echo "client_max_body_size 150M;" | sudo tee -a /etc/nginx/nginx.conf

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

## Troubleshooting

### Still getting 413 error?
1. Check if you updated the correct config file (check with `nginx -t`)
2. Make sure you reloaded nginx after changes
3. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify the limit is set: `grep client_max_body_size /etc/nginx/nginx.conf`

### Multiple server blocks?
If you have multiple server blocks (HTTP and HTTPS), update both!

### Using a reverse proxy?
If nginx is behind another reverse proxy (like Cloudflare), you may need to configure that as well.


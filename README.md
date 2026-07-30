# IPlooker -Multi-Node IP Geolocation & Network Diagnostic Tool

 Live Application:   https://www.gunnogere.tech  
 Demo Video:         https://your-demo-video-link.com  

---

#  Project Overview

Inspired by **WhatIsMyIPAddress.com**, **IPlooker** is a web-based IP inspection and geolocation platform built for developers, system administrators, and network engineers.

Unlike simple IP lookup websites, IPlooker provides practical operational value by combining **IP geolocation**, **network diagnostics**, **load-balanced infrastructure**, and **audit logging** into a single application.

## Use Cases

-  **Incident Response & Security Audits**
  - Investigate suspicious IP addresses.
  - Identify ownership, organization, ISP, country, and timezone.

-  **Geotargeting Verification**
  - Verify how requests resolve from different geographic regions.

-  **Load Balancer Verification**
  - Every lookup records which backend server (`Web01` or `Web02`) processed the request, making it easy to verify HAProxy Round-Robin behavior.

---

#  System Architecture

The application is deployed across a **3-server AWS Ubuntu infrastructure**.

```
                    +------------------+
                    | Client Browser   |
                    +------------------+
                             |
                             |
                    HTTPS (443)
                             |
                             ▼
                   +------------------+
                   | HAProxy (Lb01)   |
                   | SSL Termination  |
                   +------------------+
                      /            \
                     /              \
                    ▼                ▼
          +----------------+   +----------------+
          | Web01 (Nginx)  |   | Web02 (Nginx)  |
          +----------------+   +----------------+
                   |                    |
                   ▼                    ▼
          +----------------+   +----------------+
          | Node.js + PM2  |   | Node.js + PM2  |
          | Port 3000      |   | Port 3000      |
          +----------------+   +----------------+
```

---

# Architecture Components

## 1. HAProxy (Lb01)

Acts as the primary ingress controller.

Responsibilities:

- SSL termination
- HTTPS redirection
- Health checks
- Round-Robin load balancing
- Routes traffic between Web01 and Web02

---

## 2. Nginx (Web01 & Web02)

Each web server runs Nginx as a reverse proxy.

Responsibilities:

- Receives HTTP traffic from HAProxy
- Forwards requests to Node.js
- Serves the application

```
Client
   ↓
Nginx (Port 80)
   ↓
Node.js (Port 3000)
```

---

## 3. Node.js + Express

The Express backend:

- Proxies requests to RapidAPI
- Protects API credentials
- Returns geolocation data
- Adds custom response headers

Example:

```
x-served-by: Web01
```

or

```
x-served-by: Web02
```

---

## 4. PM2

PM2 manages the Node.js application.

Features:

- Automatic restart
- Process monitoring
- Startup on boot
- Zero manual restarts after reboot

---

#  External API Integration

This project integrates the **IP Geolocation API** by **Chetan11dev** on RapidAPI.

### Endpoint

```
/ip-geolocation
```

### Data Retrieved

- IP Address
- City
- Region
- Country
- Latitude
- Longitude
- Organization
- ISP
- Timezone
- Currency
- Country Flag

### Security

API credentials are stored securely using environment variables.

```
.env
```

The API key is **never**:

- exposed to the browser
- committed to GitHub
- included in frontend JavaScript

All requests are proxied through Express.

---

# Features

##  IP Address Validation

- IPv4 validation
- IPv6 validation
- Prevents unnecessary API calls

---

##  Interactive Map

Displays the exact location of the queried IP using Leaflet.js.

---

##  Audit History

Every search is recorded with:

- Timestamp
- IP Address
- Country
- City
- Backend Server

Includes:

- Search filter
- Clear history
- Scrollable table

---

##  Backend Server Tracking

Each request displays which server handled it.

Example:

```
Served By:
Web01
```

or

```
Served By:
Web02
```

Useful for verifying HAProxy Round-Robin distribution.

---

#  Bonus Features

## 1. Interactive Mapping

Uses **Leaflet.js** with **OpenStreetMap** tiles to display live coordinates.

---

## 2. Local Storage Caching

Search history persists across browser refreshes using:

```
localStorage
```

Stored information:

- Timestamp
- IP
- Country
- City
- Backend Node

---

## 3. Input Validation & Security

Client-side:

- `.trim()`
- IPv4 Regex
- IPv6 Regex

Server-side:

- Error handling
- API validation
- Secure proxy routing

---

#  Local Development

## Prerequisites

- Node.js v18+
- npm v9+
- RapidAPI Key

---

## 1. Clone Repository

```bash
git clone https://github.com/gunnogere/iplooker_by_gunnogere

cd iplooker
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file.

```env
PORT=3000

RAPIDAPI_KEY=the_api_key

RAPIDAPI_HOST=ip-geolocation21.p.rapidapi.com
```

---

## 4. Start the Server

Production

```bash
npm start
```

Development

```bash
npx nodemon app.js
```

---

## 5. Open the Application

```
http://localhost:3000
```

---

#  Deployment

## Web Server Configuration

Each web server runs:

- Ubuntu
- Nginx
- Node.js
- PM2

### Nginx Configuration

`/etc/nginx/sites-available/iplooker`

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {

        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;

        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;

        proxy_cache_bypass $http_upgrade;

        proxy_set_header X-Real-IP $remote_addr;

        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## PM2 Setup

```bash
pm2 start app.js --name iplooker

pm2 save

pm2 startup systemd
```

---

#  HAProxy Configuration

`/etc/haproxy/haproxy.cfg`

```cfg
global
        log /dev/log local0
        log /dev/log local1 notice
        chroot /var/lib/haproxy
        stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
        stats timeout 30s
        user haproxy
        group haproxy
        daemon
        tune.ssl.default-dh-param 2048

        ca-base /etc/ssl/certs
        crt-base /etc/ssl/private

        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
        log global
        mode http
        option httplog
        option dontlognull
        timeout connect 5000
        timeout client 50000
        timeout server 50000
        errorfile 400 /etc/haproxy/errors/400.http
        errorfile 403 /etc/haproxy/errors/403.http
        errorfile 408 /etc/haproxy/errors/408.http
        errorfile 500 /etc/haproxy/errors/500.http
        errorfile 502 /etc/haproxy/errors/502.http
        errorfile 503 /etc/haproxy/errors/503.http
        errorfile 504 /etc/haproxy/errors/504.http

frontend http-frontend
        bind *:80
        mode http
        default_backend balancer-backend

frontend https-frontend
        bind *:443 ssl crt /etc/haproxy/certs/
        mode http
        default_backend balancer-backend

backend balancer-backend
        mode http
        balance roundrobin
        server 7148-web-01 54.158.136.212:80 check
        server 7148-web-02 3.83.151.210:80 check
```

---

#  Challenges & Solutions

## Challenge 1 -Static Assets Returning 404

### Issue

Requests routed to **Web02** returned missing CSS files because Nginx served `/var/www/html` instead of forwarding requests to Node.js.

### Solution

Updated both web servers to use:

```nginx
proxy_pass http://127.0.0.1:3000;
```

Now all assets are consistently served by Express.

---

## Challenge 2 -Protecting API Credentials

### Issue

Exposing the RapidAPI key in frontend JavaScript is insecure and vulnerable to abuse.

### Solution

Implemented a backend Express endpoint:

```
/api/lookup
```

This endpoint securely proxies requests while keeping the API key protected in environment variables.

---

#  Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Process Manager | PM2 |
| Reverse Proxy | Nginx |
| Load Balancer | HAProxy |
| Hosting | AWS Ubuntu |
| Maps | Leaflet.js |
| Map Tiles | OpenStreetMap |
| API | RapidAPI IP Geolocation |
| Icons | Font Awesome |

---

# Credits

### IP Geolocation API

Chetan11dev (RapidAPI) - https://rapidapi.com/Chetan11dev/api/ip-geolocation21

### Mapping

Leaflet.js

OpenStreetMap

### Icons

Font Awesome

### AI Collaboration

Google Gemini was used as an AI pair programmer to assist with:

- README documentation
- Architecture planning
- HAProxy troubleshooting
- Debugging deployment issues

---

# License

This project was developed for educational and portfolio purposes.

---

## 👨 Author

**Your Name**

GitHub: https://github.com/YOUR_USERNAME

Portfolio: https://www.gunnogere.tech
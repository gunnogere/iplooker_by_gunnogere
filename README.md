# IPlooker — Multi-Node IP Geolocation & Network Diagnostic Tool

**Live Application:** [https://www.gunnogere.tech](https://www.gunnogere.tech)  
**Demo Video:** [Link to Demo Video (YouTube/Vimeo)](#) *(Replace with your actual video link)*

---

## 📌 Project Overview & Inspiration
Inspired by network diagnostic utilities like [WhatIsMyIPAddress.com](https://whatismyipaddress.com/), **IPlooker** is a web-based IP inspection and geolocation platform designed for developers, systems administrators, and network engineers. 

Unlike basic entertainment apps, IPlooker provides genuine operational utility:
* **Incident Response & Audit:** Instantly inspect incoming suspicious IP addresses to identify ownership, host organization, time zone, and geographic origin.
* **Geotargeting Verification:** Test how network requests resolve across different IP addresses, currencies, and time zones.
* **Multi-Node Visibility:** Every lookup records an audit log entry detailing which backend web server (`Web01` or `Web02`) served the request through our load balancer.

---

## 🛠️ Architecture & System Design

The application is deployed across a 3-server load-balanced architecture on AWS/Ubuntu infrastructure:

                      [ Client Browser ]
                              │
                              ▼
                     [ Lb01: HAProxy ]
                      (SSL Termination)
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      [ Web01: Nginx ]                [ Web02: Nginx ]
              │                               │
              ▼                               ▼
      [ PM2 / Node.js ]               [ PM2 / Node.js ]
        (Port 3000)                     (Port 3000)

1. **HAProxy (`Lb01`):** Serves as the primary ingress controller. Handles SSL termination (`https://www.gunnogere.tech`) and distributes incoming requests across web nodes using a **Round-Robin** algorithm.
2. **Nginx (`Web01` & `Web02`):** Acts as a local reverse proxy on each server, forwarding incoming traffic from port `80` to the Node.js application running on port `3000`.
3. **Node.js & Express:** Handles server-side API proxying to keep external credentials secure and attaches custom node identification headers (`x-served-by`).
4. **PM2:** Manages the Node.js application processes, ensuring auto-restart on failure and persistence across system reboots via `systemd`.

---

## 🌐 External API Integration

This application integrates the [IP Geolocation API by Chetan11dev](https://rapidapi.com/Chetan11dev/api/ip-geolocation21) hosted on RapidAPI.

* **Endpoints Used:** `/ip-geolocation`
* **Data Retreived:** City, region, country, latitude, longitude, organization, time zone, currency, and flags.
* **Security & Key Management:** The API key is stored securely on the backend using environment variables (`.env`) and is **never** exposed to the client-side browser or committed to the public Git repository. Backend routes act as a proxy layer to prevent API key exposure and mitigate client-side CORS issues.

---

## ✨ Features & User Interactions

* **Mandatory Validation:** Validates input client-side using strict IPv4/IPv6 regex formatting before triggering API requests to prevent unnecessary calls.
* **Real-time Geolocation Mapping:** Displays an interactive dynamic map centered on the target IP's exact coordinates.
* **Audit History & Filtering:** Tracks search history in a clean, scrollable log table with real-time text searching and clear options.
* **Server Tracking:** Exposes which physical node (`Web01` or `Web02`) handled each specific query.

---

## 🌟 Optional Bonus Features Included

To enhance performance, user experience, and architecture resilience, the following bonus features were implemented:

1. **Interactive Data Visualization (Map Integration):** Integrated Leaflet.js mapping to render exact geographic pins for inspected IP coordinates in real time.
2. **Local Storage Caching:** Implemented browser `localStorage` caching to persist user audit logs across browser reloads. The cache stores the query timestamp, IP address, resolved location, and the specific backend node (`Web01` vs. `Web02`) that served the request.
3. **Advanced Security & Input Validation:** Built defensive server-side error handling along with client-side input sanitization (`.trim()`, IP regex checks) to guard against injection vulnerabilities and malformed requests.

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js:** `v18.x` or higher
* **npm:** `v9.x` or higher
* RapidAPI Key for [IP Geolocation API](https://rapidapi.com/Chetan11dev/api/ip-geolocation21)

### Steps

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/iplooker.git](https://github.com/YOUR_USERNAME/iplooker.git)
   cd iplooker
Install dependencies:

Bash
npm install
Configure Environment Variables:
Create a .env file in the root directory:

Code snippet
PORT=3000
RAPIDAPI_KEY=your_actual_rapidapi_key_here
RAPIDAPI_HOST=ip-geolocation21.p.rapidapi.com
Start the local server:

Bash
npm start
# or for development mode:
npx nodemon app.js
Access the app:
Open http://localhost:3000 in your browser.

🚢 Deployment & Server Configuration
1. Web Node Setup (Web01 & Web02)
Each web node runs Node.js proxied behind Nginx and managed by PM2:

Nginx Configuration (/etc/nginx/sites-available/iplooker):

Nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass [http://127.0.0.1:3000](http://127.0.0.1:3000);
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
PM2 Service Persistence:

Bash
pm2 start app.js --name iplooker
pm2 save
pm2 startup systemd
Load Balancer Setup (Lb01 - HAProxy)
HAProxy is configured to terminate SSL and distribute traffic equally to Web01 and Web02:

HAProxy Configuration (/etc/haproxy/haproxy.cfg):

Code snippet
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/gunnogere.pem
    redirect scheme https if !{ ssl_fc }
    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /api/node-info
    server web01 10.0.1.10:80 check
    server web02 10.0.1.11:80 check
 Key Challenges & Solutions
Challenge 1: Assets Returning 404 on Specific Nodes

Issue: Requests routed by HAProxy to Web02 failed to serve style.css because Nginx was initially pointing to /var/www/html instead of proxying to Node.js.

Solution: Standardized the Nginx site configuration across both nodes using proxy_pass http://127.0.0.1:3000 so Node handles all static asset resolution.

Challenge 2: Securing API Credentials

Issue: Exposing API keys in client-side JavaScript violates security requirements and risks rate-limit depletion.

Solution: Built an Express.js backend endpoint (/api/lookup) that acts as a secure intermediary, keeping the RapidAPI secret key safely inside server-side environment variables.

 Credits & Attribution
IP Geolocation API: Created by Chetan11dev on RapidAPI.

Map Visualizations: Rendered using Leaflet.js and OpenStreetMap tiles.

UI Icons: Provided by FontAwesome.

AI Collaboration: Google Gemini was utilized as an AI pair programmer to assist in structuring the README documentation, refining architectural setup scripts, and debugging HAProxy round-robin routing logic.
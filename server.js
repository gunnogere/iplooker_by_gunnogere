require('dotenv').config();
const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Server identification for Load Balancer verification
app.get('/api/node-info', (req, res) => {
    res.json({ server: process.env.SERVER_ID});
});

// Primary Endpoint Proxy
app.get('/api/lookup', (req, res) => {
    const targetIp = req.query.ip ? req.query.ip.trim() : '';
    
    // Construct path dynamically based on query parameter
    const apiPath = targetIp 
        ? `/backend/ipinfo/?ip=${encodeURIComponent(targetIp)}` 
        : '/backend/ipinfo/';

    const options = {
        method: 'GET',
        hostname: process.env.RAPIDAPI_HOST ,
        port: null,
        path: apiPath,
        headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST,
            'Content-Type': 'application/json'
        }
    };

    const apiReq = https.request(options, function (apiRes) {
        const chunks = [];

        apiRes.on('data', function (chunk) {
            chunks.push(chunk);
        });

        apiRes.on('end', function () {
            const body = Buffer.concat(chunks).toString();
            try {
                const parsedData = JSON.parse(body);
                
                // If RapidAPI returns an error object
                if (apiRes.statusCode !== 200) {
                    return res.status(apiRes.statusCode).json({
                        success: false,
                        node: process.env.SERVER_ID ,
                        message: parsedData.message || 'API request failed'
                    });
                }

                res.json({
                    success: true,
                    node: process.env.SERVER_ID ,
                    data: parsedData
                });
            } catch (e) {
                res.status(500).json({
                    success: false,
                    node: process.env.SERVER_ID ,
                    message: 'Failed to parse JSON response from API supplier.'
                });
            }
        });
    });

    apiReq.on('error', function (e) {
        res.status(500).json({
            success: false,
            node: process.env.SERVER_ID ,
            message: `Connection error: ${e.message}`
        });
    });

    apiReq.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`IPlooker by Gunnogere is running on port ${PORT}`));
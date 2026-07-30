document.addEventListener('DOMContentLoaded', () => {
    const ipInput = document.getElementById('ip-input');
    const btnLookup = document.getElementById('btn-lookup');
    const btnMyIp = document.getElementById('btn-my-ip');
    const validationError = document.getElementById('validation-error');
    const mapContainer = document.getElementById('map-frame-container');
    const nodeIdSpan = document.getElementById('node-id');
    const historyBody = document.getElementById('history-body');
    const historySearch = document.getElementById('history-search');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const btnCopyIp = document.getElementById('btn-copy-ip');

    // UI Fields
    const heroTargetIp = document.getElementById('hero-target-ip');
    const displayIp = document.getElementById('display-ip');
    const displayOrg = document.getElementById('display-org');
    const displayIsp = document.getElementById('display-isp');
    const displayCountry = document.getElementById('display-country');
    const displayRegion = document.getElementById('display-region');
    const displayCity = document.getElementById('display-city');
    const displayLat = document.getElementById('display-lat');
    const displayLon = document.getElementById('display-lon');
    const displayTz = document.getElementById('display-tz');
    const displayCurrency = document.getElementById('display-currency');

    // Fetch Load Balancer Server Identification
    fetch('/api/node-info')
        .then(res => res.json())
        .then(data => nodeIdSpan.textContent = data.server)
        .catch(() => nodeIdSpan.textContent = 'Web01');

    // Initial render of history logs and empty UI state
    renderHistory();
    resetToEmptyState();

    function isValidIP(ip) {
        if (!ip) return true;
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    // Handles initial state & resets when lookups fail
    function resetToEmptyState() {
        heroTargetIp.textContent = "None Selected";
        displayIp.textContent = "---";
        displayOrg.textContent = "---";
        displayIsp.textContent = "---";
        displayCountry.textContent = "---";
        displayRegion.textContent = "---";
        displayCity.textContent = "---";
        displayLat.textContent = "---";
        displayLon.textContent = "---";
        displayTz.textContent = "---";
        displayCurrency.textContent = "---";
        mapContainer.innerHTML = `
            <div class="empty-map-placeholder">
                <i class="fa-solid fa-map-location-dot fa-2x"></i>
                <p>Map view will render once an IP target is inspected.</p>
            </div>`;
    }

    function renderResults(data) {
        heroTargetIp.textContent = data.ip;
        displayIp.textContent = data.ip;
        displayOrg.textContent = data.org || 'N/A';
        displayIsp.textContent = data.org ? data.org.split(' ')[0] : 'N/A';
        displayCountry.textContent = `${data.country_name || 'N/A'} (${data.country || 'N/A'}) ${data.country_flag?.emoji || ''}`;
        displayRegion.textContent = data.region || 'N/A';
        displayCity.textContent = data.city || 'N/A';
        displayLat.textContent = data.latitude || 'N/A';
        displayLon.textContent = data.longitude || 'N/A';
        displayTz.textContent = data.timezone || 'N/A';
        
        const curr = data.country_currency;
        displayCurrency.textContent = curr ? `${curr.code} (${curr.symbol})` : 'N/A';
    }

    function renderError(msg) {
        resetToEmptyState();
        heroTargetIp.textContent = "Lookup Failed";
        if (validationError) {
            validationError.textContent = `❌ ${msg}`;
            validationError.classList.remove('hidden');
        }
    }

async function executeLookup(targetIp = '') {
    validationError.classList.add('hidden');
    
    // Trim whitespace to handle empty spaces properly
    const ip = targetIp.trim();

    // Check if IP is missing or completely empty
    if (!ip) {
        renderError("Please enter an IP address to lookup.");
        return;
    }

    // Validate IP format
    if (!isValidIP(ip)) {
        renderError("Invalid IP Address format. Please check the address.");
        return;
    }

    heroTargetIp.textContent = "Scanning Target...";

    try {
        const res = await fetch(`/api/lookup?ip=${encodeURIComponent(ip)}`);
        const json = await res.json();

        if (!json.success) {
            renderError(json.message);
            return;
        }

        const data = json.data;
        renderResults(data);
        renderMap(data.latitude, data.longitude, data.city);
        saveToHistory(data, json.node);

    } catch (err) {
        renderError("Network communication failure with backend server.");
    }
}

    function renderMap(lat, lon, city) {
        let query = (lat && lon) ? `${lat},${lon}` : encodeURIComponent(city || 'World');
        const mapUrl = `https://maps.google.com/maps?q=${query}&t=m&z=12&ie=UTF8&iwloc=B&output=embed`;
        mapContainer.innerHTML = `<iframe src="${mapUrl}" loading="lazy"></iframe>`;
    }

    function saveToHistory(data, node) {
        const history = JSON.parse(localStorage.getItem('iplooker_logs') || '[]');
        const logEntry = {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ip: data.ip,
            location: `${data.city || 'Unknown'}, ${data.country || 'N/A'}`,
            org: data.org ? data.org.split(' ')[0] : 'N/A',
            node: node || 'Web01'
        };
        
        // Prevent duplicate consecutive entries
        if (history.length === 0 || history[0].ip !== data.ip) {
            history.unshift(logEntry);
            localStorage.setItem('iplooker_logs', JSON.stringify(history.slice(0, 50)));
            renderHistory();
        }
    }

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem('iplooker_logs') || '[]');
        const filter = historySearch.value.toLowerCase();
        
        const filtered = history.filter(item => 
            item.ip.toLowerCase().includes(filter) || 
            item.location.toLowerCase().includes(filter) ||
            item.org.toLowerCase().includes(filter)
        );

        historyBody.innerHTML = filtered.map(item => `
            <tr>
                <td>${item.timestamp}</td>
                <td><small><strong style="color: #0284c7;">${item.ip}</strong><small></td>
                <td>${item.location}</td>
                <td>${item.org}</td>
                <td><span class="node-badge">${item.node || 'Web-01'}</span></td>
            </tr>
        `).join('') || `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding: 15px;">No search history logs found.</td></tr>`;
    }

    // Event Handlers
    btnLookup.addEventListener('click', () => executeLookup(ipInput.value.trim()));
    btnMyIp.addEventListener('click', () => { ipInput.value = ''; executeLookup(''); });
    historySearch.addEventListener('input', renderHistory);
    btnClearHistory.addEventListener('click', () => {
        localStorage.removeItem('iplooker_logs');
        renderHistory();
    });

    btnCopyIp.addEventListener('click', () => {
        if (displayIp.textContent === '---') return;
        navigator.clipboard.writeText(displayIp.textContent);
        btnCopyIp.innerHTML = `<i class="fa-solid fa-check" style="color: #16a34a;"></i>`;
        setTimeout(() => {
            btnCopyIp.innerHTML = `<i class="fa-regular fa-copy"></i>`;
        }, 1500);
    });
});
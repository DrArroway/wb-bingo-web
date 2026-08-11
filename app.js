document.addEventListener('DOMContentLoaded', () => {
  let facilitiesData = [];

  const grid = document.getElementById('facilitiesGrid');
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('searchInput');

  // Updated Damage Tiers without visible percentages in the display name
  // The 'range' property provides the exact breakdown for tooltips
  const DAMAGE_TIERS = {
  0: { name: "No Damage", range: "0% loss", icon: "⏱️", color: "var(--damage-0)" },
  1: { name: "Targeted", range: "0-1% loss, small impact, near miss, debris fall, etc.", icon: "🎯", color: "var(--damage-1)" },
  2: { name: "Small Fire", range: "1-20% loss", icon: "🔥", color: "var(--damage-2)" },
  3: { name: "Medium Fire", range: "20-50% loss", icon: "🔥🔥", color: "var(--damage-3)" },
  4: { name: "Large Fire", range: "50-80% loss", icon: "🔥🔥🔥", color: "var(--damage-4)" },
  5: { name: "Fully uploaded to Cloud", range: "80-100% loss", icon: "🔥🔥🔥🔥 ➜ ☁️", color: "var(--damage-5)" }
};

async function loadData() {
  try {
    const response = await fetch('facilities.json');

    // Extract Last-Modified header from the server response
    const lastModifiedHeader = response.headers.get('Last-Modified');
    const updateEl = document.getElementById('lastUpdate');

    if (lastModifiedHeader && updateEl) {
      const dateObj = new Date(lastModifiedHeader);

      // Get short time zone (e.g. CEST) and long time zone (e.g. Central European Summer Time)
      const tzShort = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(dateObj)
      .find(part => part.type === 'timeZoneName')?.value || 'Local Time';

      const tzLong = new Intl.DateTimeFormat('en-US', { timeZoneName: 'long' })
      .formatToParts(dateObj)
      .find(part => part.type === 'timeZoneName')?.value || '';

      // Format ISO-style date components
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');

      // Set clean header text + hover tooltip popup
      updateEl.className = 'last-update tooltip-trigger';
      updateEl.innerHTML = `
      <span>Last Update ${year}-${month}-${day} ${hours}:${minutes}</span>
      <div class="tooltip-popup">
      <strong>Time Zone:</strong> ${tzShort}${tzLong ? ` (${tzLong})` : ''}
      </div>
      `;
    } else if (updateEl) {
      updateEl.textContent = '';
    }

    facilitiesData = await response.json();
    renderGrid();
  } catch (err) {
    console.error('Failed to load facility data:', err);
  }
}

  function getSortedAndFilteredData() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const sortValue = sortSelect.value;

    let filtered = facilitiesData.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(searchTerm);
      const regionMatch = item.region.toLowerCase().includes(searchTerm);
      return nameMatch || regionMatch;
    });

    return filtered.sort((a, b) => {
      switch (sortValue) {
        case 'footprint_desc': return b.footprint_m2 - a.footprint_m2;
        case 'footprint_asc': return a.footprint_m2 - b.footprint_m2;
        case 'damage_desc': return b.damage_level - a.damage_level;
        case 'damage_asc': return a.damage_level - b.damage_level;
        case 'distance_asc': return a.distance_border_km - b.distance_border_km;
        case 'distance_desc': return b.distance_border_km - a.distance_border_km;
        case 'date_desc':
          if (a.last_strike_date === 'N/A') return 1;
          if (b.last_strike_date === 'N/A') return -1;
          return new Date(b.last_strike_date) - new Date(a.last_strike_date);
        case 'id_asc': return a.id.localeCompare(b.id);
        default: return 0;
      }
    });
  }

  // Helper to check if a date string is within the last N days
  function isRecentStrike(dateString, daysThreshold = 3) {
    if (!dateString || dateString === 'N/A') return false;
    const strikeDate = new Date(dateString);
    const now = new Date();
    const diffInDays = (now - strikeDate) / (1000 * 60 * 60 * 24);
    return diffInDays >= 0 && diffInDays <= daysThreshold;
  }

  function renderGrid() {
    const dataToRender = getSortedAndFilteredData();
    grid.innerHTML = '';

    if (dataToRender.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No facilities found.</div>`;
      return;
    }

    dataToRender.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';

      // Look up damage info using DAMAGE_TIERS
      const damageInfo = DAMAGE_TIERS[item.damage_level] || { name: 'Unknown', range: '', icon: '❓', color: '#8b949e' };
      const fallbackImg = 'placeholder.jpg';

      // 1. Check if strike is recent (within 3 days)
      const isNew = isRecentStrike(item.last_strike_date, 3);
      const newRibbonHtml = isNew ? `
      <div class="new-ribbon">
      <span>NEW</span>
      </div>
      ` : '';

      // 2. Strikes Tooltip HTML
      let strikesHtml = item.strikes && item.strikes.length > 0
      ? item.strikes.map(s => `
      <div class="strike-event">
      <span class="strike-date">${s.date}</span>
      <p>${s.description}</p>
      </div>
      `).join('')
      : '<div>No strike events reported.</div>';

      // 3. Sources Tooltip HTML
      let sourcesHtml = item.sources && item.sources.length > 0
      ? item.sources.map(src => `
      <div class="source-item">
      <a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.name}</a>
      </div>
      `).join('')
      : '<div>No external sources linked.</div>';

      // 4. Coordinates Tooltip HTML
      const coordsText = item.coordinates || 'N/A';
      const mapsUrl = item.coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.coordinates)}` : '#';

      card.innerHTML = `
      <div class="card-header-img">
      <img src="${item.image_url || fallbackImg}" alt="${item.name}" class="card-bg-img" onerror="this.src='${fallbackImg}'">
      <div class="damage-overlay overlay-lvl-${item.damage_level}"></div>
      <div class="damage-badge" style="background-color: ${damageInfo.color}" title="Estimated impact: ${damageInfo.range}">
      ${damageInfo.icon} ${damageInfo.name}
      </div>
      ${newRibbonHtml}
      </div>

      <div class="card-body">
      <div class="card-id-region">
      <span>${item.id}</span>
      <span>${item.region}</span>
      </div>

      <!-- Name Container with GPS Tooltip -->
      <div class="tooltip-trigger name-trigger">
      <h2 class="card-title">${item.name}</h2>
      <div class="tooltip-popup">
      <strong>GPS Coordinates:</strong><br>
      <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${coordsText}</a>
      </div>
      </div>

      <div class="metrics-grid">
      <div class="metric-item">
      <span class="metric-label">Footprint</span>
      <span class="metric-value">${item.footprint_m2.toLocaleString()} m²</span>
      </div>
      <div class="metric-item">
      <span class="metric-label">Border Dist.</span>
      <span class="metric-value">${item.distance_border_km} km</span>
      </div>
      <div class="metric-item tooltip-trigger">
      <span class="metric-label">Last Strike</span>
      <span class="metric-value">${item.last_strike_date}</span>
      <div class="tooltip-popup">
      ${strikesHtml}
      </div>
      </div>

      <!-- Confidence Container with Sources Tooltip -->
      <div class="metric-item tooltip-trigger">
      <span class="metric-label">Confidence</span>
      <span class="metric-value">
      <span class="confidence-badge conf-${item.confidence}">${item.confidence}</span>
      </span>
      <div class="tooltip-popup">
      <strong>Sources:</strong>
      ${sourcesHtml}
      </div>
      </div>
      </div>
      </div>
      `;

      grid.appendChild(card);
    });
  }

  sortSelect.addEventListener('change', renderGrid);
  searchInput.addEventListener('input', renderGrid);

  loadData();
});

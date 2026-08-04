document.addEventListener('DOMContentLoaded', () => {
  let facilitiesData = [];

  const grid = document.getElementById('facilitiesGrid');
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('searchInput');

const DAMAGE_TIERS = {
    0: { name: "No Damage", icon: "🎯", color: "var(--damage-0)" },
    1: { name: "Damaged (No Fire)", icon: "💥", color: "var(--damage-1)" },
    2: { name: "Small Fire (1-20%)", icon: "🔥", color: "var(--damage-2)" },
    3: { name: "Medium Fire (20-60%)", icon: "🔥🔥", color: "var(--damage-3)" },
    4: { name: "Large Fire (60-90%)", icon: "🔥🔥🔥", color: "var(--damage-4)" },
    5: { name: "Fully uploaded to Cloud (90-100%)", icon: "🔥🔥🔥🔥 > ☁️", color: "var(--damage-5)" }
  };

  async function loadData() {
    try {
      const response = await fetch('facilities.json');
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
      const damageInfo = DAMAGE_TIERS[item.damage_level] || { name: 'Unknown', icon: '❓', color: '#8b949e' };
      const fallbackImg = 'placeholder.jpg';

      // 1. Strikes Tooltip HTML
      let strikesHtml = item.strikes && item.strikes.length > 0
      ? item.strikes.map(s => `
      <div class="strike-event">
      <span class="strike-date">${s.date}</span>
      <p>${s.description}</p>
      </div>
      `).join('')
      : '<div>No strike events reported.</div>';

      // 2. Sources Tooltip HTML (Clickable Links)
      let sourcesHtml = item.sources && item.sources.length > 0
      ? item.sources.map(src => `
      <div class="source-item">
      <a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.name}</a>
      </div>
      `).join('')
      : '<div>No external sources linked.</div>';

      // 3. Coordinates Tooltip HTML
      const coordsText = item.coordinates || 'N/A';
      const mapsUrl = item.coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.coordinates)}` : '#';

      card.innerHTML = `
      <div class="card-header-img">
      <img src="${item.image_url || fallbackImg}" alt="${item.name}" class="card-bg-img" onerror="this.src='${fallbackImg}'">
      <div class="damage-overlay overlay-lvl-${item.damage_level}"></div>
      <div class="damage-badge" style="background-color: ${damageInfo.color}">
      ${damageInfo.icon} ${damageInfo.name}
      </div>
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
      <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #58a6ff;">${coordsText}</a>
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

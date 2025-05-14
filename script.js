(() => {
  const dataUrl = 'data.json'; // URL or path to your JSON file

  const cityFilter = document.getElementById('cityFilter');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const resultsCount = document.getElementById('resultsCount');
  const objectList = document.getElementById('objectList');
  const modal = document.getElementById('objectModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalAddress = document.getElementById('modalAddress');
  const modalContact = document.getElementById('modalContact');
  const modalPhotos = document.getElementById('modalPhotos');
  const closeModalBtn = document.getElementById('closeModal');
  const adSpace = document.getElementById('adSpace');
  const toast = document.getElementById('toast');

  let data = null;
  let map = null;
  let mapMarker = null;
  let lastFocusedElement = null;

  // Toast function
  function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.pointerEvents = 'auto';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.pointerEvents = 'none';
    }, duration);
  }

  // Debounce helper
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // Highlight search term in text
  function highlightMatch(text, term) {
    if (!term) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Populate city filter options dynamically
  function populateCities(cities) {
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      cityFilter.appendChild(option);
    });
  }

  // Render object cards based on filters
  function renderObjects(filterCity = '', searchTerm = '') {
    objectList.innerHTML = '';
    const filteredObjects = data.objects.filter(obj => {
      const cityMatch = filterCity ? obj.city === filterCity : true;
      const searchMatch = searchTerm
        ? obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          obj.city.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return cityMatch && searchMatch;
    });

    resultsCount.textContent = `${filteredObjects.length} result${filteredObjects.length !== 1 ? 's' : ''}`;

    if (filteredObjects.length === 0) {
      objectList.innerHTML = '<p style="text-align:center; color:#888;">No results found. Try another search or filter.</p>';
      return;
    }

    filteredObjects.forEach(obj => {
      const card = document.createElement('article');
      card.className = 'object-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', 'false');
      card.setAttribute('aria-label', `${obj.name}, located in ${obj.city}. Click for details.`);
      card.innerHTML = `
        <h3>${highlightMatch(obj.name, searchTerm)}</h3>
        <p>${highlightMatch(obj.city, searchTerm)}</p>
      `;
      card.addEventListener('click', () => openModal(obj));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(obj);
        }
      });
      objectList.appendChild(card);
      // Animate card
      card.animate([
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    });
  }

  // Open modal with object details
  function openModal(obj) {
    lastFocusedElement = document.activeElement;
    modalTitle.textContent = obj.name;
    modalDescription.textContent = obj.description;
    modalAddress.textContent = obj.address;
    modalContact.textContent = obj.contact;

    modalPhotos.innerHTML = '';
    obj.photos.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${obj.name} photo`;
      img.loading = 'lazy';
      img.tabIndex = 0;
      modalPhotos.appendChild(img);
    });

    modal.classList.add('active');
    modal.querySelector('.modal-content').focus();

    setTimeout(() => {
      if (!map) {
        map = L.map('modalMap', { scrollWheelZoom: false, tap: false }).setView(obj.coordinates, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);
      } else {
        map.setView(obj.coordinates, 13);
        if (mapMarker) {
          map.removeLayer(mapMarker);
        }
      }
      mapMarker = L.marker(obj.coordinates).addTo(map);
    }, 100);
  }

  // Close modal
  function closeModal() {
    modal.classList.remove('active');
    if (mapMarker) {
      map.removeLayer(mapMarker);
      mapMarker = null;
    }
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  // Clear search input
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    renderObjects(cityFilter.value, '');
    showToast('Search cleared');
  });

  // Event listeners with debounce on search input
  const debouncedRender = debounce(() => {
    renderObjects(cityFilter.value, searchInput.value);
  }, 300);

  searchInput.addEventListener('input', debouncedRender);
  cityFilter.addEventListener('change', () => {
    renderObjects(cityFilter.value, searchInput.value);
  });

  closeModalBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Keyboard trap inside modal for accessibility
  modal.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });

  // Populate ads dynamically
  function populateAds(ads) {
    adSpace.innerHTML = '';
    ads.forEach(ad => {
      const a = document.createElement('a');
      a.href = ad.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', ad.name);
      const img = document.createElement('img');
      img.src = ad.image;
      img.alt = ad.name;
      img.loading = 'lazy';
      a.appendChild(img);
      adSpace.appendChild(a);
    });
  }

  // Load data.json and initialize app
  async function init() {
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      data = await response.json();
      populateCities(data.cities);
      renderObjects();
      populateAds(data.ads);
      // Restore saved preferences if any
      const savedSearch = localStorage.getItem('lastSearch');
      const savedCity = localStorage.getItem('lastCity');
      if (savedSearch) {
        searchInput.value = savedSearch;
      }
      if (savedCity) {
        cityFilter.value = savedCity;
      }
      renderObjects(cityFilter.value, searchInput.value);
    } catch (error) {
      console.error('Failed to load data:', error);
      objectList.innerHTML = '<p style="text-align:center; color:#888;">Failed to load data.</p>';
    }
  }

  // Save preferences
  searchInput.addEventListener('input', () => {
    localStorage.setItem('lastSearch', searchInput.value);
  });
  cityFilter.addEventListener('change', () => {
    localStorage.setItem('lastCity', cityFilter.value);
  });

  init();
})();

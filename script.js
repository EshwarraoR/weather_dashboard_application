const apiKey = '013f929c506f92a79c337c5837694c2f'; // Replace this!

// Elements
const weatherBox = document.getElementById('weatherDisplay');
const forecastRow = document.getElementById('forecastDisplay');
const locateBtn = document.getElementById('locateBtn');
const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');

// Helpers
function kelvinToC(tempK) {
  return Math.round(tempK - 273.15) + "°C";
}

function formatDate(dt, timezoneOffsetS) {
  const date = new Date((dt + timezoneOffsetS) * 1000);
  return date.toLocaleString(undefined, {weekday: 'short', hour: '2-digit',minute: '2-digit', hour12: true});
}

// Fetch current weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
  weatherBox.innerHTML = 'Loading...';
  forecastRow.innerHTML = '';
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;

  try {
    // Current
    const res = await fetch(url);
    const data = await res.json();

    // Forecast (3-hour steps, 5 days)
    const foreRes = await fetch(forecastUrl);
    const foreData = await foreRes.json();

    showWeather(data);
    showForecast(foreData);
  } catch (err) {
    weatherBox.innerHTML = 'Failed to fetch weather.';
  }
}

// Fetch current weather by city name
async function fetchWeatherByCity(city) {
  weatherBox.innerHTML = 'Loading...';
  forecastRow.innerHTML = '';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}`;
  try {
    // Current
    const res = await fetch(url);
    if (!res.ok) throw new Error('City not found');
    const data = await res.json();

    // Forecast
    const foreRes = await fetch(forecastUrl);
    const foreData = await foreRes.json();

    showWeather(data);
    showForecast(foreData);
  } catch (err) {
    weatherBox.innerHTML = 'Not found. Check city name or try again.';
    forecastRow.innerHTML = '';
  }
}

// UI updates
function showWeather(data) {
  // Safely extract weather info with defaults
  const w = (Array.isArray(data.weather) && data.weather[0]) ? data.weather[0] : {};
  const iconUrl = w.icon ? `https://openweathermap.org/img/wn/${w.icon}@2x.png` : '';
  const city = data.name || 'Unknown';
  const country = data.sys?.country || 'N/A';
  const temp = data.main && typeof data.main.temp === 'number' ? kelvinToC(data.main.temp) : 'N/A';
  const main = w.main || 'N/A';
  const desc = w.description || 'N/A';
  const humidity = data.main && typeof data.main.humidity === 'number' ? data.main.humidity : 'N/A';
  const wind = data.wind && typeof data.wind.speed === 'number' ? data.wind.speed : 'N/A';

  weatherBox.innerHTML = `
    <h2>${city}, ${country}</h2>
    ${iconUrl ? `<img src="${iconUrl}" alt="${desc}" />` : ''}
    <div style="font-size:1.7em;">${temp}</div>
    <div>${main} - ${desc}</div>
    <div>Humidity: ${humidity}%</div>
    <div>Wind: ${wind} m/s</div>
  `;
}

function showForecast(foreData) {
  forecastRow.innerHTML = '';
  if (!foreData.list || !Array.isArray(foreData.list)) {
    forecastRow.innerHTML = '<div class="forecast-card">No forecast data available.</div>';
    return;
  }

  const nowUnix = Math.floor(Date.now() / 1000); // current time in seconds

  // Find the first forecast index equal or after current time
  const startIndex = foreData.list.findIndex(f => f.dt >= nowUnix);
  const sliceStart = startIndex >= 0 ? startIndex : 0;

  // take next 8 forecast entries from current time (24 hours)
  const forecastSlice = foreData.list.slice(sliceStart, sliceStart + 8);

  forecastSlice.forEach(f => {
    const w = (Array.isArray(f.weather) && f.weather[0]) ? f.weather[0] : {};
    const iconUrl = w.icon ? `https://openweathermap.org/img/wn/${w.icon}.png` : '';
    const temp = f.main && typeof f.main.temp === 'number' ? kelvinToC(f.main.temp) : 'N/A';
    const main = w.main || 'N/A';
    const desc = w.description || 'N/A';
    const dateLabel = formatDate(f.dt, typeof foreData.city?.timezone === 'number' ? foreData.city.timezone : 0);

    forecastRow.innerHTML += `
      <div class="forecast-card">
        <div>${dateLabel}</div>
        ${iconUrl ? `<img src="${iconUrl}" alt="${desc}" />` : ""}
        <div>${temp}</div>
        <div>${main} - ${desc}</div>
      </div>
    `;
  });
}



// Location button
locateBtn.onclick = () => {
  if (!navigator.geolocation) {
    weatherBox.innerHTML = "Geolocation is not supported.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    err => weatherBox.innerHTML = "Permission denied or location error."
  );
};

// Search button
searchBtn.onclick = () => {
  const val = cityInput.value.trim();
  if (val) fetchWeatherByCity(val);
};
cityInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const val = cityInput.value.trim();
    if (val) fetchWeatherByCity(val);
  }
});

const cityDropdown = document.getElementById('cityDropdown');
cityDropdown.addEventListener('change', function() {
  cityInput.value = cityDropdown.value;
});


// Auto-load by location on page load
window.onload = () => locateBtn.onclick();

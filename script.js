const apiKey = '013f929c506f92a79c337c5837694c2f'; // api key from openweathermap

// DOM elements
const weatherBox = document.getElementById('weatherDisplay');
const forecastRow = document.getElementById('forecastDisplay');
const locateBtn = document.getElementById('locateBtn');
const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const alertsBox = document.getElementById('alertsBox');
const suggestionsBox = document.getElementById('suggestionsBox');
const favoritesDropdown = document.getElementById('favoritesDropdown');
const saveFavoriteBtn = document.getElementById('saveFavoriteBtn');
const deleteFavoriteBtn = document.getElementById('deleteFavoriteBtn');

// Convert temperature from Kelvin to Celsius
function kelvinToC(tempK) {
  return Math.round(tempK - 273.15) + "°C";
}

// Format Unix timestamp to readable date string with AM/PM format and timezone offset
function formatDate(dt, timezoneOffsetS = 0) {
  const date = new Date((dt + timezoneOffsetS) * 1000);
  return date.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

// Fetch weather data by geographic coordinates (latitude and longitude)
async function fetchWeatherByCoords(lat, lon) {
  // Reset UI elements while loading
  weatherBox.textContent = 'Loading...';
  forecastRow.innerHTML = '';
  alertsBox.innerHTML = '';
  suggestionsBox.innerHTML = '';
  
  // API URLs for current weather, one call (for alerts and suggestions), and forecast data
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  
  try {
    // Fetch data concurrently
    const [weatherRes, oneCallRes, forecastRes] = await Promise.all([
      fetch(url),
      fetch(oneCallUrl),
      fetch(forecastUrl)
    ]);
    
    // Parse JSON responses
    const weatherData = await weatherRes.json();
    const oneCallData = await oneCallRes.json();
    const forecastData = await forecastRes.json();

    // Update UI with obtained data
    showWeather(weatherData);
    showForecast(forecastData);
    showAlerts(oneCallData);
    showSuggestions(oneCallData);

  } catch (err) {
    // Error handling
    weatherBox.textContent = 'Failed to fetch weather.';
    forecastRow.innerHTML = '';
    alertsBox.innerHTML = '';
    suggestionsBox.innerHTML = '';
  }
}

// Fetch weather data by city name (uses geocoding API to get coordinates first)
async function fetchWeatherByCity(city) {
  // Reset UI elements while loading
  weatherBox.textContent = 'Loading...';
  forecastRow.innerHTML = '';
  alertsBox.innerHTML = '';
  suggestionsBox.innerHTML = '';

  // Geocoding API URL to resolve city name to lat/lon
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
  try {
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData[0]) throw new Error('City not found');

    const { lat, lon } = geoData[0];
    // Fetch weather data with obtained coordinates
    await fetchWeatherByCoords(lat, lon);
  } catch (err) {
    // Show error message if city not found or other errors
    weatherBox.textContent = 'Not found. Check city name or try again.';
    forecastRow.innerHTML = '';
    alertsBox.innerHTML = '';
    suggestionsBox.innerHTML = '';
  }
}

// Display current weather info in UI
function showWeather(data) {
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

// Display forecast for next 24 hours in 3-hour intervals
function showForecast(foreData) {
  forecastRow.innerHTML = '';
  
  // Validate forecast data
  if (!foreData.list || !Array.isArray(foreData.list)) {
    forecastRow.innerHTML = `<div class="forecast-card">No forecast data available.</div>`;
    return;
  }
  
  const nowUnix = Math.floor(Date.now() / 1000);
  const startIndex = foreData.list.findIndex(f => f.dt >= nowUnix);
  const sliceStart = startIndex >= 0 ? startIndex : 0;
  // Get 8 slots (3-hour intervals) for 24 hours forecast
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
        ${iconUrl ? `<img src="${iconUrl}" alt="${desc}" />` : ''}
        <div>${temp}</div>
        <div>${main} - ${desc}</div>
      </div>
    `;
  });
}

// Display any severe weather alerts using One Call API data
function showAlerts(data) {
  if (data.alerts && data.alerts.length > 0) {
    let alertText = '';
    data.alerts.forEach(a => {
      alertText += `<strong>${a.event}</strong>: ${a.description}<br/>`;
    });
    alertsBox.innerHTML = alertText;
    alertsBox.style.display = "block";
  } else {
    alertsBox.innerHTML = '';
    alertsBox.style.display = "none";
  }
}

// Show weather-based suggestions to users depending on conditions
function showSuggestions(oneCallData) {
  if (!oneCallData.current) {
    suggestionsBox.innerHTML = '';
    return;
  }
  const weatherId = oneCallData.current.weather[0].id;
  const tempC = oneCallData.current.temp - 273.15;
  const uvIndex = oneCallData.current.uvi || 0;
  const rain = oneCallData.current.rain ? oneCallData.current.rain['1h'] : 0;
  const snow = oneCallData.current.snow ? oneCallData.current.snow['1h'] : 0;

  const messages = [];

  // Determine suggestions
  if (rain > 0 || snow > 0 || (weatherId >= 200 && weatherId < 700)) {
    messages.push('🌧️ Carry an umbrella!');
  }
  if (tempC > 30) {
    messages.push('🔥 It\'s hot! Stay hydrated and wear sunscreen.');
  } else if (tempC >= 20 && tempC <= 30) {
    messages.push('🙂 Nice weather! Perfect for outdoor activities.');
  } else if (tempC < 10) {
    messages.push('🧥 It\'s chilly! Dress warmly.');
  }
  if (uvIndex >= 6) {
    messages.push('☀️ High UV index! Use sunscreen.');
  }
  if (messages.length === 0) {
    messages.push('🙂 Great weather! Enjoy your day.');
  }
  suggestionsBox.innerHTML = messages.join('<br/>');
}

// Save a city to favorites dropdown if not already added
saveFavoriteBtn.onclick = function() {
  const city = cityInput.value.trim();
  if (city && !Array.from(favoritesDropdown.options).some(opt => opt.value === city)) {
    const option = document.createElement('option');
    option.value = city;
    option.innerText = city;
    favoritesDropdown.appendChild(option);
  }
};

// Delete the selected city from favorites dropdown
deleteFavoriteBtn.onclick = function() {
  const selectedCity = favoritesDropdown.value;
  if (selectedCity && selectedCity !== '') {
    for (let i = 0; i < favoritesDropdown.options.length; i++) {
      if (favoritesDropdown.options[i].value === selectedCity) {
        favoritesDropdown.remove(i);
        break;
      }
    }
    // Clear city input if matches deleted city
    if (cityInput.value === selectedCity) {
      cityInput.value = '';
    }
  }
};

// On favorites dropdown change, fetch city weather immediately
favoritesDropdown.onchange = function() {
  cityInput.value = this.value;
  if (this.value) fetchWeatherByCity(this.value);
};

// Use browser geolocation to get user location weather
locateBtn.onclick = () => {
  if (!navigator.geolocation) {
    weatherBox.textContent = "Geolocation not supported.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    err => weatherBox.textContent = "Permission denied or location error."
  );
};

// Search button click triggers city-based weather search
searchBtn.onclick = () => {
  const val = cityInput.value.trim();
  if (val) fetchWeatherByCity(val);
};

// Pressing Enter in city input triggers search as well
cityInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const val = cityInput.value.trim();
    if (val) fetchWeatherByCity(val);
  }
});

// On page load, trigger location based weather fetch automatically
window.onload = () => locateBtn.onclick();

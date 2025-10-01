const apiKey = '2aa6e0f9063a664c1a97d5a1cd56b182'; // api key from openweathermap

// DOM elements

const weatherBox = document.getElementById('weatherDisplay');
const forecastRow = document.getElementById('forecastDisplay');
const locateBtn = document.getElementById('locateBtn');
const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const alertsBox = document.getElementById('alertsBox');
const errorBox = document.getElementById('errorBox');
const favoritesDropdown = document.getElementById('favoritesDropdown');
const saveFavoriteBtn = document.getElementById('saveFavoriteBtn');
const deleteFavoriteBtn = document.getElementById('deleteFavoriteBtn');

function kelvinToC(tempK) {
  return Math.round(tempK - 273.15) + "°C";
}

function formatDate(dt, timezoneOffsetS = 0) {
  const date = new Date((dt + timezoneOffsetS) * 1000);
  return date.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

async function fetchWeatherByCoords(lat, lon) {
  errorBox.style.display = "none";
  weatherBox.textContent = 'Loading...';
  forecastRow.innerHTML = '';
  alertsBox.innerHTML = '';

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;

  try {
    const [weatherRes, forecastRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(forecastUrl)
    ]);
    if (!weatherRes.ok) throw new Error(`Weather API: ${weatherRes.status}`);
    if (!forecastRes.ok) throw new Error(`Forecast API: ${forecastRes.status}`);

    const weatherData = await weatherRes.json();
    const forecastData = await forecastRes.json();

    showWeather(weatherData);
    showForecast(forecastData);
    showAlertsBasedOnWeather(weatherData);

  } catch (err) {
    showError(`Failed to fetch weather: ${err.message}`);
  }
}

async function fetchWeatherByCity(city) {
  errorBox.style.display = "none";
  weatherBox.textContent = 'Loading...';
  forecastRow.innerHTML = '';
  alertsBox.innerHTML = '';

  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
  try {
    const geoRes = await fetch(geoUrl);
    if(!geoRes.ok) throw new Error(`Geo API: ${geoRes.status}`);
    const geoData = await geoRes.json();
    if (!geoData[0]) throw new Error("City not found");
    const { lat, lon } = geoData[0];
    await fetchWeatherByCoords(lat, lon);

  } catch (err) {
    showError(`City not found or error occurred: ${err.message}`);
  }
}

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

function showForecast(foreData) {
  forecastRow.innerHTML = '';
  if (!foreData.list || !Array.isArray(foreData.list)) {
    forecastRow.innerHTML = `<div class="forecast-card">No forecast data available.</div>`;
    return;
  }
  const nowUnix = Math.floor(Date.now() / 1000);
  const startIndex = foreData.list.findIndex(f => f.dt >= nowUnix);
  const sliceStart = startIndex >= 0 ? startIndex : 0;
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

function showAlertsBasedOnWeather(data) {
  if (!data || !data.weather) return;

  const main = data.weather[0].main.toLowerCase();
  let alertHtml = "";

  switch(main) {
    case "thunderstorm":
      alertHtml = "<strong>Thunderstorm Warning:</strong> Stay indoors and avoid metal objects.";
      break;
    case "tornado":
      alertHtml = "<strong>Tornado Warning:</strong> Take immediate shelter.";
      break;
    case "snow":
      alertHtml = "<strong>Snow Alert:</strong> Drive carefully on icy roads.";
      break;
    case "extreme":
      alertHtml = "<strong>Extreme Weather Alert:</strong> Stay safe.";
      break;
    default:
      alertHtml = "";
  }

  if(alertHtml) {
    alertsBox.innerHTML = alertHtml;
    alertsBox.style.display = "block";
  } else {
    alertsBox.innerHTML = "";
    alertsBox.style.display = "none";
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
  weatherBox.textContent = '';
  forecastRow.innerHTML = '';
  alertsBox.innerHTML = '';
}

window.onload = () => locateBtn.onclick();

saveFavoriteBtn.onclick = () => {
  const city = cityInput.value.trim();
  if(city && !Array.from(favoritesDropdown.options).some(opt => opt.value === city)) {
    const option = document.createElement('option');
    option.value = city;
    option.text = city;
    favoritesDropdown.add(option);
  }
};

deleteFavoriteBtn.onclick = () => {
  const selectedCity = favoritesDropdown.value;
  if(selectedCity) {
    for (let i = 0; i < favoritesDropdown.options.length; i++) {
      if(favoritesDropdown.options[i].value === selectedCity) {
        favoritesDropdown.remove(i);
        break;
      }
    }
    if(cityInput.value === selectedCity) cityInput.value = '';
  }
};

favoritesDropdown.onchange = function(){
  cityInput.value = this.value;
  if(this.value) fetchWeatherByCity(this.value);
};

locateBtn.onclick = () => {
  if(!navigator.geolocation) {
    showError("Geolocation not supported.");
    return;
  }
  hideError();
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showError("Permission denied or location error.")
  );
};

searchBtn.onclick = () => {
  const val = cityInput.value.trim();
  if(val) fetchWeatherByCity(val);
};

cityInput.addEventListener("keydown", e => {
  if(e.key === "Enter") {
    e.preventDefault();
    const val = cityInput.value.trim();
    if(val) fetchWeatherByCity(val);
  }
});

function hideError() {
  errorBox.style.display = "none";
}

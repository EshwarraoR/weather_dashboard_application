const apiKey = '2aa6e0f9063a664c1a97d5a1cd56b182'; // api key from openweathermap

// DOM elements

const weatherBox = document.getElementById('weatherDisplay');
const forecastRow = document.getElementById('forecastDisplay');
const locateBtn = document.getElementById('locateBtn');
const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const alertsBox = document.getElementById('alertsBox');
const suggestionsBox = document.getElementById('suggestionsBox');
const errorBox = document.getElementById('errorBox');
const favoritesDropdown = document.getElementById('favoritesDropdown');
const saveFavoriteBtn = document.getElementById('saveFavoriteBtn');
const deleteFavoriteBtn = document.getElementById('deleteFavoriteBtn');

function kelvinToC(tempK) {
  return Math.round(tempK - 273.15) + "°C";
}
function formatDate(dt, timezoneOffsetS = 0) {
  const date = new Date((dt + timezoneOffsetS) * 1000);
  return date.toLocaleString(undefined, {weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true});
}

// Robust fetch: handles network, permission, and API errors cleanly
async function fetchWeatherByCoords(lat, lon) {
  errorBox.style.display = "none";
  weatherBox.textContent = 'Loading...';
  forecastRow.innerHTML = '';
  alertsBox.innerHTML = '';
  suggestionsBox.innerHTML = '';

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;

  try {
    const [weatherRes, oneCallRes, forecastRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(oneCallUrl),
      fetch(forecastUrl)
    ]);
    if (!weatherRes.ok) throw new Error("Weather API: " + weatherRes.status);
    if (!oneCallRes.ok) throw new Error("One Call API: " + oneCallRes.status);
    if (!forecastRes.ok) throw new Error("Forecast API: " + forecastRes.status);
    const weatherData = await weatherRes.json();
    const oneCallData = await oneCallRes.json();
    const forecastData = await forecastRes.json();

    // show UI
    showWeather(weatherData);
    showForecast(forecastData);
    showAlerts(oneCallData);
    showSuggestions(oneCallData);

  } catch (err) {
    errorBox.innerHTML = "Failed to fetch weather.<br><span style='font-size:0.95em;'>" + err.message + "</span>";
    errorBox.style.display = "block";
    weatherBox.textContent = '';
    forecastRow.innerHTML = '';
    alertsBox.innerHTML = '';
    suggestionsBox.innerHTML = '';
  }
}

async function fetchWeatherByCity(city) {
  errorBox.style.display = "none";
  weatherBox.textContent = 'Loading...';
  forecastRow.innerHTML = '';
  alertsBox.innerHTML = '';
  suggestionsBox.innerHTML = '';

  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
  try {
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error("Geo API: " + geoRes.status);
    const geoData = await geoRes.json();
    if (!geoData[0]) throw new Error('City not found');
    const { lat, lon } = geoData[0];
    await fetchWeatherByCoords(lat, lon);
  } catch (err) {
    errorBox.innerHTML = "Not found. Check city name or try again.<br><span style='font-size:0.95em;'>" + err.message + "</span>";
    errorBox.style.display = "block";
    weatherBox.textContent = '';
    forecastRow.innerHTML = '';
    alertsBox.innerHTML = '';
    suggestionsBox.innerHTML = '';
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

// Severe weather alerts display
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

// Weather-based suggestions (robust check)
function showSuggestions(oneCallData) {
  if (!oneCallData.current || !Array.isArray(oneCallData.current.weather) || !oneCallData.current.weather[0]) {
    suggestionsBox.innerHTML = 'No suggestions available';
    suggestionsBox.style.display = "block";
    return;
  }
  const weatherId = oneCallData.current.weather[0].id;
  const tempK = oneCallData.current.temp;
  const tempC = (typeof tempK === 'number') ? tempK - 273.15 : null;
  const uvIndex = (typeof oneCallData.current.uvi === 'number') ? oneCallData.current.uvi : 0;
  const rain = oneCallData.current.rain ? oneCallData.current.rain['1h'] : 0;
  const snow = oneCallData.current.snow ? oneCallData.current.snow['1h'] : 0;

  const messages = [];

  if (rain > 0 || snow > 0 || (weatherId >= 200 && weatherId < 700)) {
    messages.push('🌧️ Carry an umbrella!');
  }
  if (tempC !== null) {
    if (tempC > 30) {
      messages.push('🔥 It\'s hot! Stay hydrated and wear sunscreen.');
    } else if (tempC >= 20 && tempC <= 30) {
      messages.push('🙂 Nice weather! Perfect for outdoor activities.');
    } else if (tempC < 20 && tempC >= 10) {
      messages.push('🌤️ Mild weather, dress comfortably.');
    } else if (tempC < 10) {
      messages.push('🧥 It\'s chilly! Dress warmly.');
    }
  }
  if (uvIndex >= 6) {
    messages.push('☀️ High UV index! Use sunscreen.');
  }
  if (messages.length === 0) {
    messages.push('🙂 Great weather! Enjoy your day.');
  }
  suggestionsBox.innerHTML = messages.join('<br/>');
  suggestionsBox.style.display = "block";
}

// Save favorite city
saveFavoriteBtn.onclick = function() {
  const city = cityInput.value.trim();
  if (city && !Array.from(favoritesDropdown.options).some(opt => opt.value === city)) {
    const option = document.createElement('option');
    option.value = city;
    option.innerText = city;
    favoritesDropdown.appendChild(option);
  }
};
// Delete favorite city
deleteFavoriteBtn.onclick = function() {
  const selectedCity = favoritesDropdown.value;
  if (selectedCity && selectedCity !== '') {
    for (let i = 0; i < favoritesDropdown.options.length; i++) {
      if (favoritesDropdown.options[i].value === selectedCity) {
        favoritesDropdown.remove(i);
        break;
      }
    }
    if (cityInput.value === selectedCity) {
      cityInput.value = '';
    }
  }
};
// Selecting favorite loads its weather
favoritesDropdown.onchange = function() {
  cityInput.value = this.value;
  if (this.value) fetchWeatherByCity(this.value);
};
// Use My Location
locateBtn.onclick = () => {
  if (!navigator.geolocation) {
    errorBox.innerHTML = "Geolocation not supported.";
    errorBox.style.display = "block";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    err => {
      errorBox.innerHTML = "Permission denied or location error.";
      errorBox.style.display = "block";
      weatherBox.textContent = '';
    }
  );
};
// Search Button
searchBtn.onclick = () => {
  const val = cityInput.value.trim();
  if (val) fetchWeatherByCity(val);
};
// Enter key triggers search
cityInput.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const val = cityInput.value.trim();
    if (val) fetchWeatherByCity(val);
  }
});
window.onload = () => locateBtn.onclick();

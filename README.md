# Cloudify AI Weather Dashboard

A modern, AI-powered weather dashboard that provides real-time weather information, air quality data, and interactive maps.

## Features

- Real-time weather data using OpenWeather API
- Air Quality Index (AQI) monitoring
- Interactive Google Maps with AQI overlay
- Dark/Light theme support
- Responsive design
- AI-powered chat interface

## Setup

1. Clone the repository:

```bash
git clone <your-repository-url>
cd weather-dashboard
```

2. Get API Keys:

- Get an API key from [OpenWeather](https://openweathermap.org/api)
- Get an API key from [AQICN](https://aqicn.org/api/)

3. Update the API keys in `app.js`:

```javascript
const WEATHER_API_KEY = "your_openweather_api_key";
const AQI_API_KEY = "your_aqicn_api_key";
```

4. Open `index.html` in your browser or serve it using a local server.

## Technologies Used

- HTML5
- CSS3 (with Tailwind CSS)
- JavaScript (ES6+)
- Google Maps API
- OpenWeather API
- AQICN API

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

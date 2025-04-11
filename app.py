from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

AQI_TOKEN = "9c19f75ef061cb97e6ec372bb66b3abec7757db5"
LLM_SERVER = "http://192.168.195.138:1234"

@app.route('/api/weather', methods=['POST'])
def get_weather():
    try:
        data = request.json
        lat = data.get('latitude')
        lon = data.get('longitude')

        # Get location name
        geo_response = requests.get(
            f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
        )
        geo_data = geo_response.json()
        location = geo_data.get('city') or geo_data.get('locality') or geo_data.get('principalSubdivision')

        # Get AQI data
        aqi_response = requests.get(
            f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={AQI_TOKEN}"
        )
        aqi_data = aqi_response.json()

        if aqi_data['status'] != 'ok':
            return jsonify({'error': 'Failed to fetch AQI data'}), 400

        # Get LLM analysis
        aqi_value = aqi_data['data']['aqi']
        aqi_status = get_aqi_status(aqi_value)
        
        prompt = f"The current AQI in {location} is {aqi_value}, which is {aqi_status}. Please provide a brief analysis of what this means for residents and any recommended actions."
        
        llm_response = requests.post(
            f"{LLM_SERVER}/v1/chat/completions",
            json={
                "model": "llama-3.2-1b-instruct",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 150
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if llm_response.status_code != 200:
            return jsonify({'error': 'Failed to get LLM analysis'}), 500

        llm_data = llm_response.json()
        analysis = llm_data['choices'][0]['message']['content']

        return jsonify({
            'location': location,
            'aqi': aqi_value,
            'status': aqi_status,
            'color': get_aqi_color(aqi_value),
            'analysis': analysis
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_aqi_status(aqi):
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"

def get_aqi_color(aqi):
    if aqi <= 50:
        return "#00e400"
    elif aqi <= 100:
        return "#ffff00"
    elif aqi <= 150:
        return "#ff7e00"
    elif aqi <= 200:
        return "#ff0000"
    elif aqi <= 300:
        return "#8f3f97"
    else:
        return "#7e0023"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 
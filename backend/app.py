from flask import Flask, request, jsonify
from flask_cors import CORS
from geopy.geocoders import Nominatim
import requests
import random
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
CORS(app, supports_credentials=True)

API_KEY = os.getenv('OPENWEATHERMAP_API_KEY')
geolocator = Nominatim(user_agent="walija.project@email.com")


# -------------------- Get Coordinates Route --------------------
@app.route("/get-coordinates", methods=["POST"])
def get_coordinates():
    data = request.get_json()
    from_location = data.get("from_location")
    to_location = data.get("to_location")

    if not from_location or not to_location:
        return jsonify({"error": "Both 'from_location' and 'to_location' are required"}), 400

    from_coords = geolocator.geocode(from_location)
    to_coords = geolocator.geocode(to_location)

    if from_coords and to_coords:
        return jsonify({
            "from": {
                "location": from_location,
                "latitude": from_coords.latitude,
                "longitude": from_coords.longitude
            },
            "to": {
                "location": to_location,
                "latitude": to_coords.latitude,
                "longitude": to_coords.longitude
            }
        })
    else:
        return jsonify({"error": "One or both locations could not be found."}), 404


# -------------------- AQI Data Route --------------------
# Simple round-to-2-decimal cache key to reuse nearby coordinates
_aqi_cache = {}

def fetch_aqi_data(lat, lng):
    # Round to 2 decimal places (~1.1km) for caching
    cache_key = (round(float(lat), 2), round(float(lng), 2))
    if cache_key in _aqi_cache:
        return _aqi_cache[cache_key]
    try:
        url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lng}&appid={API_KEY}"
        response = requests.get(url, timeout=5)
        resp_json = response.json()
        data_list = resp_json.get("list", [])

        if not data_list:
            _aqi_cache[cache_key] = None
            return None

        data = data_list[0]
        pm25 = data.get('components', {}).get('pm2_5')
        pm10 = data.get('components', {}).get('pm10')

        if pm25 is None and pm10 is None:
            _aqi_cache[cache_key] = None
            return None

        smog_level = (pm25 * 0.7) + (pm10 * 0.3)
        result = {
            "pm25": pm25,
            "pm10": pm10,
            "smogLevel": smog_level,
            "aqiLevel": data.get('main', {}).get('aqi', 'Unavailable')
        }
        _aqi_cache[cache_key] = result
        return result
    except Exception as e:
        print(f"Error fetching AQI data internal: {e}")
        return None

# -------------------- AQI Data Route --------------------
@app.route('/aqi-data', methods=['GET'])
def get_aqi_data():
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({"error": "Missing lat or lng in query params"}), 400

    data = fetch_aqi_data(lat, lng)
    if data:
        return jsonify({
            "location": {"lat": lat, "lng": lng},
            **data
        })
    else:
        return jsonify({"error": "Smog level data not available for this location"}), 404

# -------------------- Smog Variation Route --------------------
@app.route('/smog-variation', methods=['POST'])
def smog_variation():
    points = request.get_json()

    if not isinstance(points, list) or len(points) == 0:
        return jsonify({"error": "Invalid input. Expected array of objects."}), 400

    all_same = all(point['smogLevel'] == points[0]['smogLevel'] for point in points)

    if all_same:
        varied = []
        for point in points:
            variation = random.randint(-15, 15)
            new_level = max(0, point['smogLevel'] + variation)
            varied.append({**point, "smogLevel": new_level})
        return jsonify(varied)
    else:
        return jsonify(points)

# -------------------- Route Finder --------------------
MAPBOX_TOKEN = os.getenv('MAPBOX_TOKEN')

def geocode(place):
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{place}.json"
    params = {
        "access_token": MAPBOX_TOKEN,
        "limit": 1,
        "autocomplete": False,
        "types": "address,poi,place"
    }
    response = requests.get(url, params=params).json()
    if not response["features"]:
        raise Exception(f"Location not found: {place}")
    return response["features"][0]["center"]  # [lng, lat]

def parse_location(loc):
    if re.match(r"^-?\d+\.\d+,-?\d+\.\d+$", loc.strip()):
        parts = loc.strip().split(",")
        return [float(parts[1]), float(parts[0])] # Ensure [lng, lat] order if input is lat,lng
    else:
        return geocode(loc)

def internal_get_routes(from_loc, to_loc):
    from_coords = parse_location(from_loc)
    to_coords = parse_location(to_loc)

    coordinates = f"{from_coords[0]},{from_coords[1]};{to_coords[0]},{to_coords[1]}"

    url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{coordinates}"
    params = {
        "access_token": MAPBOX_TOKEN,
        "alternatives": "true",
        "geometries": "geojson",
        "overview": "full",
        "steps": "true",
        "annotations": "duration,distance"
    }

    res = requests.get(url, params=params)
    if res.status_code != 200:
        return None

    routes_data = res.json().get("routes", [])
    routes_output = []
    for idx, route in enumerate(routes_data):
        total_distance = route["distance"]
        total_points = max(2, int(total_distance / 3000))
        
        if 'geometry' in route and 'coordinates' in route['geometry']:
            all_coords = route['geometry']['coordinates']
            spaced_coords = []
            step = max(1, len(all_coords) // total_points)
            for i in range(0, len(all_coords), step):
                spaced_coords.append(all_coords[i])
            if len(spaced_coords) == 0 or spaced_coords[-1] != all_coords[-1]:
                spaced_coords.append(all_coords[-1])
        else:
            spaced_coords = []

        steps = []
        for leg in route["legs"]:
            for step in leg["steps"]:
                steps.append({
                    "instruction": step["maneuver"]["instruction"],
                    "location": {
                        "longitude": step["maneuver"]["location"][0],
                        "latitude": step["maneuver"]["location"][1]
                    },
                    "distance": step["distance"],
                    "duration": step["duration"]
                })

        routes_output.append({
            "route_number": idx + 1,
            "distance_km": round(route["distance"] / 1000, 2),
            "duration_min": round(route["duration"] / 60, 2),
            "path_coordinates": spaced_coords,
            "steps": steps
        })
    return routes_output

@app.route("/get-routes", methods=["POST"])
def get_routes():
    try:
        data = request.get_json()
        from_loc = data.get("from_location")
        to_loc = data.get("to_location")
        routes = internal_get_routes(from_loc, to_loc)
        if routes:
            return jsonify({"routes": routes})
        return jsonify({"error": "No routes found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#------------------Optimization--------------------
@app.route("/get-optimal-route", methods=["POST"])
def get_optimal_route():
    try:
        data = request.get_json()
        from_loc = data.get("from_location")
        to_loc = data.get("to_location")

        if not from_loc or not to_loc:
            return jsonify({"error": "Missing input locations"}), 400

        routes_data = internal_get_routes(from_loc, to_loc)
        if not routes_data:
            return jsonify({"error": "Failed to fetch routes"}), 500

        w_smog = 10  # High priority to smog
        w_distance = 1

        def get_smog_weight(level):
            if level <= 50: return 1
            if level <= 100: return 2
            if level <= 150: return 4
            if level <= 200: return 8
            return 15

        # ---- Helper: score a single (lat, lng) point ----
        def score_point(coord):
            lng_c, lat_c = coord
            aqi_data = fetch_aqi_data(lat_c, lng_c)
            if aqi_data:
                return get_smog_weight(aqi_data.get("smogLevel", 0))
            return 3  # neutral fallback

        scored_routes = []
        for route in routes_data:
            path = route["path_coordinates"]

            # Cap at 5 evenly-spaced sample points (start, end + 3 in between)
            MAX_SAMPLES = 5
            if len(path) <= MAX_SAMPLES:
                sample_path = path
            else:
                indices = [int(i * (len(path) - 1) / (MAX_SAMPLES - 1)) for i in range(MAX_SAMPLES)]
                sample_path = [path[i] for i in indices]

            # Run all AQI requests for this route in parallel
            total_smog_score = 0
            with ThreadPoolExecutor(max_workers=MAX_SAMPLES) as executor:
                futures = [executor.submit(score_point, coord) for coord in sample_path]
                for future in as_completed(futures):
                    total_smog_score += future.result()

            segment_count = len(sample_path) or 1
            avg_smog_score = total_smog_score / segment_count

            final_score = (avg_smog_score * w_smog) + (route["distance_km"] * w_distance)

            scored_routes.append({
                "route": route,
                "score": round(final_score, 2)
            })

        scored_routes.sort(key=lambda r: r["score"])
        return jsonify({"ranked_routes": scored_routes})

    except Exception as e:
        print(f"Error in optimal route: {e}")
        return jsonify({"error": str(e)}), 500

# -------------------- Root Route --------------------
@app.route("/", methods=["GET"])
def home():
    return "Flask backend for ClearWay is running!"

if __name__ == "__main__":
    app.run(debug=True, port=5000)

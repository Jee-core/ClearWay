from flask import Flask, request, jsonify
from flask_cors import CORS
from geopy.geocoders import Nominatim
import requests
import random
import re

app = Flask(__name__)
CORS(app, supports_credentials=True)

API_KEY = 'c9a2ffd8b58c24398c07807296d4c81a'
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
@app.route('/aqi-data', methods=['GET'])
def get_aqi_data():
    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({"error": "Missing lat or lng in query params"}), 400

    try:
        url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lng}&appid={API_KEY}"
        response = requests.get(url)
        print(f"OpenWeather API status: {response.status_code}, response: {response.text}")

        resp_json = response.json()
        data_list = resp_json.get("list", [])

        if not data_list:
            return jsonify({"error": "No pollution data found for this location"}), 404

        data = data_list[0]

        pm25 = data.get('components', {}).get('pm2_5')
        pm10 = data.get('components', {}).get('pm10')

        if pm25 is None and pm10 is None:
            return jsonify({"error": "Smog level data not available for this location"}), 404

        smog_level = (pm25 * 0.7) + (pm10 * 0.3)

        return jsonify({
            "location": {"lat": lat, "lng": lng},
            "pm25": pm25,
            "pm10": pm10,
            "smogLevel": smog_level,
            "aqiLevel": data.get('main', {}).get('aqi', 'Unavailable')
        })

    except Exception as e:
        print(f"Error fetching AQI data: {e}")
        return jsonify({"error": "Failed to fetch data from OpenWeather API"}), 500

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
    # -------------------- Route Finder using OpenRouteService --------------------


MAPBOX_TOKEN = 'pk.eyJ1IjoiYWppeWEiLCJhIjoiY21kdDVpdWU0MGN1ZDJqcXg4cDA2OXFjZCJ9.w3gCN_6cr6H5z35FO595Ag'


# -------------------- PARSE OR GEOCODE LOCATION --------------------
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
        lng, lat = map(float, loc.strip().split(","))
        return [lng, lat]
    else:
        return geocode(loc)


# -------------------- GET ROUTES FROM MAPBOX --------------------
@app.route("/get-routes", methods=["POST"])
def get_routes():
    try:
        data = request.get_json()
        from_loc = data.get("from_location")
        to_loc = data.get("to_location")

        if not from_loc or not to_loc:
            return jsonify({"error": "Missing input locations"}), 400

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
            return jsonify({
                "error": "Failed to fetch routes",
                "status_code": res.status_code,
                "response": res.text
            }), res.status_code

        routes_data = res.json().get("routes", [])
        if not routes_data:
            return jsonify({"error": "No routes found"}), 404

        routes_output = []
        for idx, route in enumerate(routes_data):
            total_distance = route["distance"]  # in meters
            # Calculate points every 3km (3000 meters)
            total_points = max(2, int(total_distance / 3000))  # At least 2 points (start+end)
            
            # Get evenly spaced points along the route
            if 'geometry' in route and 'coordinates' in route['geometry']:
                all_coords = route['geometry']['coordinates']
                spaced_coords = []
                
                # Calculate indices for evenly spaced points (every 3km)
                step = max(1, len(all_coords) // total_points)
                for i in range(0, len(all_coords), step):
                    spaced_coords.append(all_coords[i])
                
                # Always include the last point
                if len(spaced_coords) == 0 or spaced_coords[-1] != all_coords[-1]:
                    spaced_coords.append(all_coords[-1])
            else:
                spaced_coords = []

            # Process steps/instructions
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
                "path_coordinates": spaced_coords,  # Coordinates every ~3km
                "steps": steps
            })

        return jsonify({"routes": routes_output})

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

        # Get all candidate routes
        routes_response = requests.post("http://127.0.0.1:5000/get-routes", json={
            "from_location": from_loc,
            "to_location": to_loc
        })

        if routes_response.status_code != 200:
            return jsonify({"error": "Failed to fetch routes"}), 500

        routes_data = routes_response.json().get("routes", [])

        # ----------------------------
        # Weight Constants (adjustable)
        # ----------------------------
        w_smog = 5
        w_traffic = 2
        w_weather = 3
        w_distance = 1

        # Helper function to assign smog weight
        def get_smog_weight(level):
            if level <= 50: return 1
            if level <= 100: return 2
            if level <= 150: return 3
            if level <= 200: return 4
            if level <= 300: return 5
            return 6

        # Dummy functions to simulate traffic and weather
        def get_traffic_delay_weight():
            return random.choice([0, 1, 2, 3])

        def get_weather_penalty():
            return random.choice([0, 2, 5, 7, 10])

        scored_routes = []

        for route in routes_data:
            path = route["path_coordinates"]
            total_smog_score = 0
            total_traffic_score = 0
            total_weather_score = 0

            for lng, lat in path:
                # Get AQI/smog score
                aqi_res = requests.get(f"http://localhost:5000/aqi-data?lat={lat}&lng={lng}")
                if aqi_res.status_code == 200:
                    smog_level = aqi_res.json().get("smogLevel", 0)
                    smog_weight = get_smog_weight(smog_level)
                    total_smog_score += smog_weight
                else:
                    total_smog_score += 3  # Neutral value if fail

                total_traffic_score += get_traffic_delay_weight()
                total_weather_score += get_weather_penalty()

            segment_count = len(path) or 1

            final_score = (
                (total_smog_score / segment_count) * w_smog +
                (total_traffic_score / segment_count) * w_traffic +
                (total_weather_score / segment_count) * w_weather +
                route["distance_km"] * w_distance
            )

            # Add score to route and save it
            route_with_score = {
                "route": route,
                "score": round(final_score, 2)
            }
            scored_routes.append(route_with_score)

        # Sort routes by ascending score (best first)
        scored_routes.sort(key=lambda r: r["score"])

        return jsonify({
            "ranked_routes": scored_routes
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------- Root Route --------------------
@app.route("/", methods=["GET"])
def home():
    return "Flask backend is working! Use /get-coordinates, /aqi-data or /smog-variation."


if __name__ == "__main__":
    app.run(debug=True, port=5000)

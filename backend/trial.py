import requests
import os
from dotenv import load_dotenv

load_dotenv()

print("Script started...")

url = "https://api.openrouteservice.org/v2/directions/driving-car"
headers = {
    "Authorization": os.getenv('OPENROUTESERVICE_KEY'),
    "Content-Type": "application/json"
}
body = {
    "coordinates": [[73.0479, 33.6844], [74.3436, 31.5497]]
}

res = requests.post(url, json=body, headers=headers)
print("Status:", res.status_code)
print("Body:", res.text)
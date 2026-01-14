
import requests

print("Script started...")

url = "https://api.openrouteservice.org/v2/directions/driving-car"
headers = {
    "Authorization": "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijg0ZWE0MGFkZmU5ZTRiOThiODRjM2JiOTc2OWYyOTlhIiwiaCI6Im11cm11cjY0In0=",
    "Content-Type": "application/json"
}
body = {
    "coordinates": [[73.0479, 33.6844], [74.3436, 31.5497]]
}

res = requests.post(url, json=body, headers=headers)
print("Status:", res.status_code)
print("Body:", res.text)


# ClearWay 🚦🌫️

**ClearWay** is a smart routing application designed to find the **best route** from a source to a destination, while factoring in **real-time traffic conditions** and **air quality (smog) levels**. It integrates seamlessly with maps to provide optimized navigation for a healthier and faster journey.

---

## Features

* **Real-time Traffic Analysis**: Monitors current traffic conditions to suggest the fastest route.
* **Air Quality Awareness**: Considers smog levels along possible routes, helping you avoid highly polluted areas.
* **Smart Route Optimization**: Balances between travel time and air quality to provide the healthiest and most efficient path.
* **Map Integration**: Visual route representation using map services for easy navigation.
* **User-Friendly Interface**: Clean UI that shows route options, traffic congestion, and pollution indicators.

---

## How It Works

1. **Input Source & Destination**: User provides start and end points.
2. **Fetch Real-Time Data**: Application retrieves live traffic updates and air quality index (AQI) for areas along possible routes.
3. **Calculate Optimal Route**: Algorithm evaluates routes based on a combination of travel time and pollution levels.
4. **Display Route on Map**: The chosen route is displayed interactively on the integrated map.
5. **Route Suggestions**: Alternative routes are also provided with traffic and smog comparisons.

---

## Tech Stack

* **Frontend**: React / HTML / CSS / JS
* **Backend**: Node.js / Python Flask
* **Maps & Routing**: Google Maps API / Mapbox
* **Traffic Data**: Google Traffic API / OpenTraffic
* **Air Quality Data**: OpenAQ / AQI API
* **Algorithm**: Custom pathfinding with weighted optimization for traffic and smog

---

## Installation & Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/clearway.git
   ```
2. Install dependencies:

   ```bash
   npm install   # for frontend
   pip install -r requirements.txt   # for backend
   ```
3. Add your **API keys** for maps, traffic, and air quality data in `.env`.
4. Run the backend server:

   ```bash
   npm start   # or python app.py
   ```
5. Run the frontend:

   ```bash
   npm run dev
   ```
6. Open your browser at `http://localhost:3000` to start using ClearWay.

---

## Future Enhancements

* **Public Transport Integration**: Include buses, metro, and rideshare options.
* **Predictive Smog Routing**: Suggest routes based on forecasted air quality trends.
* **Mobile App Version**: iOS and Android apps for on-the-go navigation.
* **User Preferences**: Customize weighting for time vs air quality for route selection.

---

## Collaborators

* [VE-Vaniya](https://github.com/VE-Vaniya)
* [Ayka Imran](https://github.com/aykaimran)
* [Maryam irshad](https://github.com/maryamirshad04)

---

## Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature-name`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.



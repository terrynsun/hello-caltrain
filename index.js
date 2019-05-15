var ROUTES_URL = 'gtfs/routes.txt';
var STOPS_URL = 'gtfs/stops.txt';
var STOP_TIMES_URL = 'gtfs/stop_times.txt';

class Data {
  constructor(routes, stationIds, stationNames, trips) {
    this.routes = routes;
    this.stationIds = stationIds;
    this.stationNames = stationNames;
    this.trips = trips;
  }
}

class State {
  constructor() {
    // Station lists always stored in North-South order.
    this.actives = [];
    this.favorites = [];

    // 1 = northbound, 0 = southbound
    this.northbound = 1;
  }
}

function toggleCity(list, station, stationNames) {
  var idx = list.indexOf(station);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(station);
    list.sort((a, b) => {
      return stationNames[a][0] - stationNames[b][0];
    });
  }
  console.log(list);
}

function clearNode(node) {
  // node is a dom element
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
}

function toggleButtonPrimary(b) {
  // b should be the actual dom button element
  var cls = b.getAttribute('class');
  if (cls == 'button-primary') {
    b.removeAttribute('class');
  } else {
    b.setAttribute('class', 'button-primary');
  }
}

/*
 * a, b are strings of the form "hh:mm" in 24-hour format.
 */
function sortTime(a, b) {
  if (a == b) {
    return 0;
  }

  var [hrA, minA] = a.split(':').map(x => Number.parseInt(x));
  var [hrB, minB] = b.split(':').map(x => Number.parseInt(x));

  if (hrA > hrB || (hrA == hrB && minA > minB)) {
    return 1;
  } else {
    return -1;
  }
}

/*
 * Time between a and b, subtracting a from b.
 * a, b are strings of the form "hh:mm" in 24-hour format.
 */
function subTimes(a, b) {
  var [hrA, minA] = a.split(':').map(x => Number.parseInt(x));
  var [hrB, minB] = b.split(':').map(x => Number.parseInt(x));

  var hrDiff = hrB - hrA;
  var minDiff = minB - minA;
  if (minDiff > 0) {
    return hrDiff * 60 + minDiff;
  } else {
    hrDiff -= 1;
    minDiff += 60;
    return hrDiff * 60 + minDiff;
  }
}

function parseCSV(text) {
  var lines = text.split('\n');

  var data = [];
  // Skip first line (csv column names)
  for (var i = 1; i < lines.length; i++) {
    var l = lines[i];
    if (l.length === 0) {
      // Skip final line
      continue;
    }
    var csv = l.split(',');
    data.push(csv);
  }

  return data;
}

function parseRoutes(data) {
  // agency_id,route_id,route_short_name,route_long_name,route_desc,route_type,route_url,route_color,route_text_color,route_sort_order,min_headway_minutes,eligibility_restricted
  var routes = {};
  for (var i = 0; i < data.length; i++) {
    var line = data[i];
    var id = line[1];
    var name = line[2];
    routes[id] = name;
  }
  return routes;
}

function parseStops(data) {
  // stop_id,stop_code,platform_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station,stop_timezone,position,direction,wheelchair_boarding
  var stationIds = {};
  var stationNames = {};

  for (var i = 0; i < data.length; i++) {
    var line = data[i];
    var id = line[0];
    var fullName = line[3];

    // Remove ".. Caltrain" suffix
    var name = fullName.substring(0, fullName.indexOf(" Caltrain"));
    stationIds[id] = name;
    if (stationNames[name] == undefined) {
      stationNames[name] = [];
    }
    stationNames[name].push(id);
  }

  return stationIds, stationNames;
}

function parseTimes(data) {
  // trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type,shape_dist_traveled,timepoint,start_service_area_id,end_service_area_id,start_service_area_radius,end_service_area_radius,continuous_pickup,continuous_drop_off,pickup_area_id,drop_off_area_id,pickup_service_area_radius,drop_off_service_area_radius

  var trips = {};

  for (var i = 0; i < data.length; i++) {
    var line = data[i];
    var tripId = line[0];
    if (trips[tripId] === undefined) {
      trips[tripId] = [];
    }

    // Time is given as "hh:mm:ss", trim the ":ss"
    // var arrival = line[1];
    var departure = line[2];
    departure = departure.substring(0, departure.length - 3);
    var stop = line[3];

    trips[tripId].push([stop, departure]);
  }

  return trips;
}

async function loadData() {
  var routes = await fetch(ROUTES_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched routes.csv');
        var data = parseCSV(text);
        return parseRoutes(data);
      });
  });

  var stationIds, stationNames = await fetch(STOPS_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched stops.csv');
        var data = parseCSV(text);
        return parseStops(data);
      });
  });

  var times = await fetch(STOP_TIMES_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched times.csv');
        var data = parseCSV(text);
        return parseTimes(data);
      });
  });

  return [routes, stationIds, stationNames, times];
}

function drawFavorites(state, data) {
  var favs = state.favorites;
  var actives = state.actives;

  var stationNames = data.stationNames;

  var div = document.querySelector('#favorites');
  clearNode(div);

  for (const f of favs) {
    const b = document.createElement('button');
    if (actives.indexOf(f) > -1) {
      toggleButtonPrimary(b);
    }
    b.textContent = f;
    b.addEventListener('click', (e) => { // jshint ignore:line
      toggleButtonPrimary(b);
      toggleCity(actives, f, stationNames);
      drawTrainTable(state, data);
    });
    div.appendChild(b);
  }
}

// Given list of all trips, and stations that we're interested in,
// Return all trips which visit at least two stations.

// stationIds: stations to include
// trips: all trips
// northbound: 1 = northbound, 0 = southbound
function getActiveTrips(stationIds, trips, northbound) {
  var activeTrips = [];

  // Get the trips which stop at two or more of the active train stations
  for (const id in trips) {
    // Ignore shuttles and _holiday trains for now.
    if (isNaN(Number(id))) {
      continue;
    // Ignore trains going the other way
    } else if (Number(id) % 2 !== northbound) {
      continue;
    } else {
      var numActiveStops = 0;

      var stops = [];

      for (const stop of trips[id]) {
        var station = stop[0];
        var time = stop[1];

        var idx = stationIds.indexOf(station);
        if (idx !== -1) {
          numActiveStops++;
          stops[idx] = time;
        }
      }

      if (numActiveStops < 2) {
        continue;
      }

      // Compute length of time
      var tripLength = subTimes(
        stops.find((x) => x !== undefined),
        stops[stops.length - 1]
      );

      // For northbound trips, reverse.
      if (northbound === 1) {
        stops.reverse();
        tripLength = tripLength * -1;
      }

      // Fill missing gaps if not all stations are visited by a train
      for (var i = 0; i < stationIds.length; i++) {
        if (stops[i] == undefined) {
          stops[i] = '-';
        }
      }

      // Prepend trip ID
      stops.unshift(`#${id}`);

      // Append trip length
      stops.push(`${tripLength} min`);

      activeTrips.push(stops);
    }
  }

  // Sort by first station the train visits.
  activeTrips.sort((a, b) => {
    return sortTime(
      a.slice(1).find((x) => x !== '-'),
      b.slice(1).find((x) => x !== '-')
    );
  });

  return activeTrips;
}

function drawTrainTableButtons(state, data) {
  var div = document.querySelector('#traintable-buttons');

  clearNode(div);

  // Northbound-southbound
  var dirButton = document.createElement('button');
  dirButton.textContent = 'Northbound';
  dirButton.addEventListener('click', (e) => { // jshint ignore:line
    if (state.northbound === 0) {
      state.northbound = 1;
      dirButton.textContent = 'Northbound';
    } else {
      state.northbound = 0;
      dirButton.textContent = 'Southbound';
    }
    drawTrainTable(state, data);
  });
  div.appendChild(dirButton);

  // Weekday, Saturday, Sunday buttons can toggle but don't do anything
  for (const text of ['Weekday', 'Saturday', 'Sunday']) {
    const b = document.createElement('button');
    b.textContent = text;
    div.appendChild(b);
  }
}

function drawTrainTable(state, data) {
  var active = state.actives;
  var northbound = state.northbound;
  var trips = data.trips;
  var stationNames = data.stationNames;

  var table = document.querySelector('#trains-table');

  // Clear any existing data.
  clearNode(table);

  var stationIds = [];
  // Convert station names into IDs
  for (const s of active) {
    var ids = stationNames[s];
    if (northbound === 1) {
      stationIds.push(ids[0]);
    } else {
      stationIds.push(ids[1]);
    }
  }

  // Draw header
  var thead = document.createElement('thead');
  var tr = document.createElement('tr');
  thead.appendChild(tr);

  var th = document.createElement('th');
  th.textContent = 'Train';
  tr.appendChild(th);

  const len = active.length;
  for (var i = 0; i < len; i++) {
    var idx = i;
    if (northbound === 0) {
      idx = len - i - 1;
    }

    const station = active[idx];
    th = document.createElement('th');
    th.textContent = station;
    tr.appendChild(th);
  }

  th = document.createElement('th');
  th.textContent = 'Length';
  tr.appendChild(th);

  table.appendChild(thead);

  // Draw body
  var tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const activeTrips = getActiveTrips(stationIds, trips, northbound);

  for (const trip of activeTrips) {
    var row = document.createElement('tr');

    for (const v of trip) {
      var td = document.createElement('td');
      td.textContent = v;
      row.appendChild(td);
    }

    tbody.appendChild(row);
  }
}

function drawStationList(stations) {
  var div = document.querySelector('#all-stations');
  for (const s in stations) {
    var row = document.createElement('div');
    row.setAttribute('class', 'row');
    div.appendChild(row);

    var b = document.createElement('button');
    b.textContent = '+';
    row.appendChild(b);

    var bstar = document.createElement('button');
    bstar.textContent = '★';
    row.appendChild(bstar);

    var t = document.createTextNode(` ${s}`);
    row.appendChild(t);
  }
}

async function main() {
  var [routes, stationIds, stationNames, trips] = await loadData();

  const data = new Data(routes, stationIds, stationNames, trips);

  // TODO: actually load user preferences
  var state = new State();
  state.favorites = ['San Francisco', 'San Mateo', 'Palo Alto', 'Mountain View'];
  state.actives = ['San Mateo', 'Hillsdale', 'Palo Alto'];

  drawFavorites(state, data);
  drawTrainTableButtons(state, data);
  drawTrainTable(state, data);
  drawStationList(stationNames);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./worker.js')
    .then(() => {
      console.log('Service Worker Registered');
    });

  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('message received');
  });

  main();
}

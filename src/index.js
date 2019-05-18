import * as Time from './time.js';
import * as Data from './data.js';

class State {
  constructor() {
    // Station lists always stored in North-South order.
    this.actives = [];
    this.favorites = [];

    // 1 = northbound, 0 = southbound
    this.northbound = 1;

    this.schedule = 'weekday';
  }
}

function toggleCity(list, station, stationNames) {
  const idx = list.indexOf(station);
  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push(station);
    list.sort((a, b) => {
      return stationNames[a][0] - stationNames[b][0];
    });
  }
}

function clearNode(node) {
  // node is a dom element
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
}

function toggleButtonColor(b) {
  // b should be the actual dom button element
  const cls = b.getAttribute('class');
  if (cls == 'button-primary') {
    b.removeAttribute('class');
  } else {
    b.setAttribute('class', 'button-primary');
  }
}

function setButtonColor(b, active) {
  // b should be the actual dom button element
  const cls = b.getAttribute('class');
  if (active) {
    b.setAttribute('class', 'button-primary');
  } else {
    b.removeAttribute('class');
  }
}

function drawFavorites(state, data) {
  const favs = state.favorites;
  const actives = state.actives;

  const stationNames = data.stationNames;

  let div = document.querySelector('#favorites');
  clearNode(div);

  for (const f of favs) {
    const b = document.createElement('button');
    if (actives.indexOf(f) > -1) {
      toggleButtonColor(b);
    }
    b.textContent = f;
    b.addEventListener('click', (e) => { // jshint ignore:line
      toggleButtonColor(b);
      toggleCity(actives, f, stationNames);
      drawTrainTable(state, data);
    });
    div.appendChild(b);
  }

  // Create buttons for other active stations so we can remove them
  div = document.querySelector('#other-actives');
  clearNode(div);

  for (const s of actives) {
    if (favs.indexOf(s) == -1) {
      const b = document.createElement('button');
      toggleButtonColor(b);
      b.textContent = s;
      b.addEventListener('click', (e) => { //jshint ignore:line
        toggleCity(actives, s, stationNames);
        drawTrainTable(state, data);
        drawFavorites(state, data);
      });
      div.appendChild(b);
    }
  }

}

// Given list of all trips, and stations that we're interested in,
// Return all trips which visit at least two stations.

// stationIds: stations to include
// trips: all trips
// northbound: 1 = northbound, 0 = southbound
function getActiveTrips(stationIds, trips, state) {
  const activeTrips = [];

  // Get the trips which stop at two or more of the active train stations
  for (const [id, t] of Object.entries(trips)) {
    // Ignore shuttles and _holiday trains for now.
    if (isNaN(Number(id))) {
      continue;
    // Ignore trains going the other way
    } else if (Number(id) % 2 !== state.northbound) {
      continue;
    // Ignore trains not scheduled on the current day
    } else if (!t.service[state.schedule]) {
      continue;
    } else {
      let numActiveStops = 0;

      const stops = [];

      for (const stop of t.stops) {
        const station = stop[0];
        const time = stop[1];

        const idx = stationIds.indexOf(station);
        if (idx !== -1) {
          numActiveStops++;
          stops[idx] = time;
        }
      }

      if (numActiveStops < 2) {
        continue;
      }

      // Compute length of time
      let tripLength = Time.subTimes(
        stops.find((x) => x !== undefined),
        stops[stops.length - 1]
      );

      // For northbound trips, reverse.
      if (state.northbound === 1) {
        stops.reverse();
        tripLength = tripLength * -1;
      }

      // Fill missing gaps if not all stations are visited by a train
      for (let i = 0; i < stationIds.length; i++) {
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
    return Time.cmpTimes(
      a.slice(1).find((x) => x !== '-'),
      b.slice(1).find((x) => x !== '-')
    );
  });

  return activeTrips;
}

function drawTrainTableButtons(state, data) {
  const div = document.querySelector('#traintable-buttons');

  clearNode(div);

  // Northbound-southbound
  const dirButton = document.createElement('button');
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

  // Weekday, Saturday, Sunday buttons
  for (const text of ['weekday', 'saturday', 'sunday']) {
    const b = document.createElement('button');
    b.textContent = text;
    div.appendChild(b);

    if (state.schedule == text) {
      setButtonColor(b, true);
    }

    b.addEventListener('click', (e) => { // jshint ignore:line
      state.schedule = text;
      for (const bother of div.childNodes) {
        setButtonColor(bother, false);
      }
      setButtonColor(b, true);

      drawTrainTable(state, data);
    });
  }
}

function drawTrainTable(state, data) {
  const active = state.actives;
  const northbound = state.northbound;
  const trips = data.trips;
  const stationNames = data.stationNames;

  const table = document.querySelector('#trains-table');

  // Clear any existing data.
  clearNode(table);

  const stationIds = [];
  // Convert station names into IDs
  for (const s of active) {
    const ids = stationNames[s];
    if (northbound === 1) {
      stationIds.push(ids[0]);
    } else {
      stationIds.push(ids[1]);
    }
  }

  // Draw header
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  thead.appendChild(tr);

  let th = document.createElement('th');
  th.textContent = 'Train';
  tr.appendChild(th);

  const len = active.length;
  for (let i = 0; i < len; i++) {
    let idx = i;
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
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const activeTrips = getActiveTrips(stationIds, trips, state);

  for (const trip of activeTrips) {
    const row = document.createElement('tr');

    for (const v of trip) {
      const td = document.createElement('td');
      td.textContent = v;
      row.appendChild(td);
    }

    tbody.appendChild(row);
  }
}

function drawStationList(state, data) {
  const stations = data.stationNames;

  const div = document.querySelector('#all-stations');
  for (const s in stations) {
    const row = document.createElement('div');
    row.setAttribute('class', 'row');
    div.appendChild(row);

    const bstar = document.createElement('button');
    bstar.textContent = '★';
    if (state.favorites.indexOf(s) > -1) {
      toggleButtonColor(bstar);
    }
    bstar.addEventListener('click', (e) => { // jshint ignore:line
      toggleCity(state.favorites, s, stations);
      toggleButtonColor(bstar);
      drawFavorites(state, data);
    });
    row.appendChild(bstar);

    const btoggle = document.createElement('button');
    btoggle.textContent = s;
    if (state.actives.indexOf(s) > -1) {
      toggleButtonColor(btoggle);
    }
    btoggle.addEventListener('click', (e) => { // jshint ignore:line
      toggleCity(state.actives, s, stations);
      toggleButtonColor(btoggle);
      drawFavorites(state, data);
      drawTrainTable(state, data);
    });
    row.appendChild(btoggle);
  }
}

async function main() {
  const data = await Data.loadData();

  // TODO: actually load user preferences
  const state = new State();
  state.favorites = ['San Francisco', 'San Mateo', 'Palo Alto', 'Mountain View'];
  state.actives = ['San Mateo', 'Hillsdale', 'Palo Alto'];

  drawFavorites(state, data);
  drawTrainTableButtons(state, data);
  drawTrainTable(state, data);
  drawStationList(state, data);
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

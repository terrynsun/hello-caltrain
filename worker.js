var ROUTES = {};

var cacheName = 'hello-caltrain';
var filesToCache = [
  '/',
];

var GTFS_URL = './CT-GTFS.zip';
var ROUTES_URL = 'gtfs/routes.txt';
var STOPS_URL = 'gtfs/stops.txt';
var STOP_TIMES_URL = 'gtfs/stop_times.txt';

function parseCSV(text) {
  var lines = text.split('\n');

  var data = [];
  for (var i = 0; i < lines.length; i++) {
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
  var stops = {};
  for (var i = 0; i < data.length; i++) {
    var line = data[i];
    var id = line[0];
    var name = line[3];
    stops[id] = name;
  }

  return stops;
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

    // var arrival = line[1];
    var departure = line[2];
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

  var stops = await fetch(STOPS_URL)
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

  return [routes, stops, times];
}

async function main() {
  var [routes, stops, times] = await loadData();

}

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      main();
      //return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate',  event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, {ignoreSearch:true}).then(response => {
      return response || fetch(event.request);
    })
  );
});

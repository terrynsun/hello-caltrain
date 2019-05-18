var ROUTES_URL = 'gtfs/routes.txt';
var TRIPS_URL = 'gtfs/trips.txt';
var STOPS_URL = 'gtfs/stops.txt';
var STOP_TIMES_URL = 'gtfs/stop_times.txt';
var CALENDAR_URL = 'gtfs/calendar.txt';

export class Trip {
  constructor(id, route, service) {
    this.id = id;

    // Local, Limited, Bullet, TaSJ, Special
    this.route = route;

    // { weekday: bool, saturday: bool, sunday: bool }
    // TODO: handle special days
    this.service = service || {};

    // [ [ stop name: string, time: string ] ]
    this.stops = [];
  }

  addStop(stop, time) {
    this.stops.push([stop, time]);
  }
}

export class Data {
  constructor(routes, stationIds, stationNames, trips) {
    this.routes = routes;
    this.stationIds = stationIds;
    this.stationNames = stationNames;

    // { id: string -> Trip }
    this.trips = trips;
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

function parseCalendar(data) {
  //service_id,service_name,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
  var services = {};

  for (const line of data) {
    var id = line[0];
    services[id] = {
      'weekday': line[2] == '1',
      'saturday': line[7] == '1',
      'sunday': line[8] == '1',
    };
  }

  return services;
}

function parseTrips(data, services, routes) {
  // route_id,service_id,trip_id,trip_short_name,trip_headsign,direction_id,block_id,shape_id,bikes_allowed,wheelchair_accessible,trip_type,drt_max_travel_time,drt_avg_travel_time,drt_advance_book_min,drt_pickup_message,drt_drop_off_message,continuous_pickup_message,continuous_drop_off_message

  const trips = {};

  for (const line of data) {
    const [routeId, serviceId, id] = line;

    trips[id] = new Trip(id, routes[routeId], services[serviceId]);
  }

  return trips;
}

function parseStopTimes(data, trips) {
  // trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type,shape_dist_traveled,timepoint,start_service_area_id,end_service_area_id,start_service_area_radius,end_service_area_radius,continuous_pickup,continuous_drop_off,pickup_area_id,drop_off_area_id,pickup_service_area_radius,drop_off_service_area_radius

  for (const line of data) {
    var id = line[0];
    if (trips[id] === undefined) {
      console.log('Error parsing stop_times!');
    }

    // Time is given as "hh:mm:ss", trim the ":ss"
    // var arrival = line[1];
    var departure = line[2];
    departure = departure.substring(0, departure.length - 3);
    var stop = line[3];

    trips[id].addStop(stop, departure);
  }

  return trips;
}

export async function loadData() {
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

  var services = await fetch(CALENDAR_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched calendar.csv');
        var data = parseCSV(text);
        return parseCalendar(data);
      });
  });

  var trips = await fetch(TRIPS_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched trips.csv');
        var data = parseCSV(text);
        return parseTrips(data, services, routes);
      });
  });

  var _ = await fetch(STOP_TIMES_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched stop_times.csv');
        var data = parseCSV(text);
        parseStopTimes(data, trips, services);
      });
  });

  const data = new Data(routes, stationIds, stationNames, trips);

  return data;
}

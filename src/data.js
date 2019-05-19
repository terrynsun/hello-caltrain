const ROUTES_URL = 'gtfs/routes.txt';
const TRIPS_URL = 'gtfs/trips.txt';
const STOPS_URL = 'gtfs/stops.txt';
const STOP_TIMES_URL = 'gtfs/stop_times.txt';
const CALENDAR_URL = 'gtfs/calendar.txt';

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

export class Station {
  constructor(id, name, zone) {
    this.ids = [id];
    this.name = name;
    this.zone = zone;
  }

  addId(id) {
    this.ids.push(id);
  }
}

export class Data {
  constructor(routes, stations, trips) {
    // "Bullet", "Local", "Limited", "TaSJ-Shuttle", "Special"
    this.routes = routes;

    // { name -> [northbound id, southbound id] }
    this.stations = stations;

    // { id: string -> Trip }
    this.trips = trips;
  }
}

function trimN(s, n) {
  return s.substring(0, s.length - n);
}

function trimSuffix(s, suffix) {
  return s.substring(0, s.indexOf(suffix));
}

function parseCSV(text) {
  const lines = text.split('\n');

  // Skip first line (csv column names)
  lines.shift();

  // Skip last line if empty
  if (lines[lines.length - 1].length == 0) {
    lines.pop();
  }

  return lines.map(line => line.split(','));
}

function parseRoutes(data) {
  // agency_id,route_id,route_short_name,route_long_name,route_desc,route_type,route_url,route_color,route_text_color,route_sort_order,min_headway_minutes,eligibility_restricted
  const routes = {};
  for (const line of data) {
    const id = line[1];
    const name = line[2];
    routes[id] = name;
  }
  return routes;
}

function parseStops(data) {
  // stop_id,stop_code,platform_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station,stop_timezone,position,direction,wheelchair_boarding
  let zoneBase = Number(data[0][7]);
  let actualZone = 1;

  const stations = {};

  for (const line of data) {
    const id = line[0];
    // trim trailing '... Caltrain'
    const name = trimSuffix(line[3], ' Caltrain');

    if (stations[name] == undefined) {
      // Increment zone when the zone id changes, since the csv's zone_id field doesn't map to zones we actually use.
      const inputZone = Number(line[7]);
      if (inputZone != zoneBase) {
        actualZone += 1;
        zoneBase = inputZone;
      }

      stations[name] = new Station(id, name, actualZone);
    } else {
      stations[name].addId(id);
    }
  }

  return stations;
}

function parseCalendar(data) {
  //service_id,service_name,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
  const services = {};

  for (const line of data) {
    const id = line[0];
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
    const id = line[0];
    if (trips[id] === undefined) {
      console.log('Error parsing stop_times!');
    }

    // Time is given as "hh:mm:ss", trim the ":ss"
    // const arrival = line[1];
    const departure = trimN(line[2], ':00'.length);
    const stop = line[3];

    trips[id].addStop(stop, departure);
  }

  return trips;
}

export async function loadData() {
  let routes = await fetch(ROUTES_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched routes.csv');
        let data = parseCSV(text);
        return parseRoutes(data);
      });
  });

  let stations = await fetch(STOPS_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched stops.csv');
        let data = parseCSV(text);
        return parseStops(data);
      });
  });

  let services = await fetch(CALENDAR_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched calendar.csv');
        let data = parseCSV(text);
        return parseCalendar(data);
      });
  });

  let trips = await fetch(TRIPS_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched trips.csv');
        let data = parseCSV(text);
        return parseTrips(data, services, routes);
      });
  });

  let _ = await fetch(STOP_TIMES_URL)
    .then(response => {
      return response.text().then(text => {
        console.log('Fetched stop_times.csv');
        let data = parseCSV(text);
        parseStopTimes(data, trips, services);
      });
  });

  const data = new Data(routes, stations, trips);

  return data;
}

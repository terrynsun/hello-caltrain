/*
 * a, b are strings of the form "hh:mm" in 24-hour format.
 */
export function cmpTimes(a, b) {
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
export function subTimes(a, b) {
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

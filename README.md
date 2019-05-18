# Hello Caltrain

Caltrain GTFS (General Transit Feed Specification) is downloaded from the
[developer page](dev). [Here is a direct link.](gtfs)

[dev]: http://www.caltrain.com/developer.html
[gtfs]: http://www.caltrain.com/Assets/GTFS/caltrain/CT-GTFS.zip

# TODO

- [x] Generate buttons for station list at bottom of page
* UI
  - [ ] Consider [Barebones](Barebones) intead of Skeleton
  - [x] Why isn't there any padding around buttons?
  - [x] Change color scheme so "primary" = "activated" is not blue
- Hook up buttons so they do anything
  - [x] Add/remove trains from current timetable
  - [x] Add/remove trains from favorites
  - [x] North vs. southbound toggle
- [x] Toggle weekday/weekend trains (calendar.txt, calendar_dates.txt)
- [ ] Filter for only limited/bullet trains?
- [ ] Figure out holiday trains
- [ ] Grey out passed trains; scroll to current time of day
- [ ] Add favicon
- [ ] Separate trains at bottom by zone

# Future features

- Bookmark specific trips

[Barebones]: https://github.com/acahir/Barebones

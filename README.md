#Node dashboard
=========

Real-time analytics using node.js and socket.io. Live at [node-dashboard.herokuapp.com](http://node-dashboard.herokuapp.com/).

It has a landing page and dashboard (navigate to [/dashboard](http://node-dashboard.herokuapp.com/dashboard)), with the dashboard logging the views and device types currently on the landing page.

It uses node.js, the express framework, redis for data persistence, the d3 library, and socket.io.

## Todo: 

* Fix bugs with pie chart rendering
  * renders none-existent views
	* doesn't render when data updated
	* seperate sections render for same device type
* Make button more prominent
* Add other analytics

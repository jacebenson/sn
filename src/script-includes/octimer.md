---
title: "OCTimer"
id: "octimer"
---

API Name: global.OCTimer

```js
var OCTimer = Class.create();
OCTimer.prototype = {
	initialize: function(timerName) {
		this.timerName = JSUtil.nil(timerName) ? "DEFAULT" : timerName;
		this.timings = {};
		this.stack = [];
	},

	start: function(name) {
		if (!this.timings[name]) {
			this.timings[name] = {};
			this.timings[name].count = 1;
			this.timings[name].start = [];
			this.timings[name].end = [];
			this.timings[name].log = [];
			this.stack.push(name);
		} else {
			this.timings[name].count++;
			this.timings[name].log[this.timings[name].count] = "";
		}
		this.timings[name].start.push(new Date().getTime());
	},

	stop: function(name) {
		this.timings[name].end.push(new Date().getTime());
	},

	millisToTime: function (millis) {
		var minutes = Math.floor(millis / 60000);
		var seconds = ((millis % 60000) / 1000).toFixed(3);
		var result = (seconds < 10 ? "0" : "") + seconds;
		if (minutes > 0)
			result = minutes + ":" + result;
		return result;
	},

	result: function() {
		var total = 0;
		var title = this.timerName + " Performance Timings";
		var result = title + "\n";
		for (var j = 0; j < this.stack.length; j++) {
			var name = this.stack[j];
			var subTotal = 0;
			var methodLog = " Log: ";
			for (var i = 0; i < this.timings[name].count; i++) {
				var duration = this.timings[name].end[i] - this.timings[name].start[i];
				subTotal += duration;
				if (!JSUtil.nil(this.timings[name].log[i]))
					methodLog += this.timings[name].log[i];
				if (i == (this.timings[name].count -1)) {
					result += this.millisToTime(subTotal) + " " + name + " invoked: " + this.timings[name].count;
					if (methodLog.length > 6)
						result += methodLog;
					result += "\n";
				}
			}
			total += subTotal;
		}
		result += this.millisToTime(total) + " [TOTAL] for: " + title;
		return result;
	},

	log: function(name, entry) {
		var currentCount = this.timings[name].count;
		if (this.timings[name].log[currentCount])
			this.timings[name].log[currentCount] += " " + entry;
		else
			this.timings[name].log[currentCount] = entry;
	},	

	type: 'OCTimer'
};
```
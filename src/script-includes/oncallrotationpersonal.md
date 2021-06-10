---
title: "OnCallRotationPersonal"
id: "oncallrotationpersonal"
---

API Name: global.OnCallRotationPersonal

```js
gs.include("PrototypeServer");
var OnCallRotationPersonal = Class.create();
OnCallRotationPersonal.prototype = {
    initialize: function() {
    },
	
	onCallDuringPeriod: function(group, /*GlideDateTime*/ startTime, /*GlideDateTime*/ endTime) {
		var periodsOnCall = [];
		var items = this.getItems(group, startTime, endTime);
		for (var i = 0; i < items.size(); i++) {
			var item = items.get(i);
			//Do checks here so that item is
			//rotation item
			var type = item.getDataByKey('type');
			if(type == 'rotation' || type == 'coverage') {
				periodsOnCall.push(item);
			}
		}
		return periodsOnCall;
	},
	
	getItems: function(group, start, end) {
		//Get timezone
		var timezone = gs.getSession().getTimeZoneName();
		//Get items
		var page = new GlideAJAXSchedulePage(start, end ,timezone);
		gs.include("OnCallRotationCalculator");
		var rotation = new OnCallRotationCalculator();
		rotation.setPage(page);
		//probably find all groups a user is part of
		rotation.run(group);

		return rotation.page.getItems();
	},

    type: function() {
      return 'OnCallRotationPersonal';
   }
}
```
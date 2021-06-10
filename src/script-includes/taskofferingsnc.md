---
title: "TaskOfferingSNC"
id: "taskofferingsnc"
---

API Name: global.TaskOfferingSNC

```js
var TaskOfferingSNC = Class.create();
TaskOfferingSNC.prototype = {
    initialize: function() {
    },

	removeServiceOffering: function(taskSysId) {
		if (!taskSysId)
			return;

		var m2m = new GlideRecord('task_service_offering');
		m2m.addQuery('task', taskSysId);
		m2m.addQuery('manually_added', false);
		m2m.deleteMultiple();
	},

	addServiceOffering: function(taskSysId, services) {
		if (!taskSysId)
			return;

		var offerings = this.getOfferings(services);

		var m2m = new GlideRecord('task_service_offering');
		for (var i = 0; i < offerings.length; i++) {
			m2m.initialize();
			m2m.setValue('task', taskSysId);
			m2m.setValue('service_offering', offerings[i]);
			m2m.setValue('manually_added', false);
			m2m.insert();
		}
	},

	getOfferings: function(services) {
		var offeringGr = new GlideRecord('service_offering');
		offeringGr.addQuery('parent', "IN", services);
		offeringGr.query();

		var offeringArr = [];
		while (offeringGr.next())
			offeringArr.push(offeringGr.getUniqueValue());

      return offeringArr;
	},

    type: 'TaskOfferingSNC'
};
```
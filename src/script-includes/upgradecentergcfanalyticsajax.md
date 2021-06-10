---
title: "UpgradeCenterGCFAnalyticsAjax"
id: "upgradecentergcfanalyticsajax"
---

API Name: global.UpgradeCenterGCFAnalyticsAjax

```js
var UpgradeCenterGCFAnalyticsAjax = Class.create();
UpgradeCenterGCFAnalyticsAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	sendUsageAnalyticsEvent: function(category, point, event, sampleMap) {
		try {
			if (!category)
				category = this.getParameter('sysparm_category');
			
			if (!point)
				point = this.getParameter('sysparm_point');
			
			if (!event)
				event = this.getParameter('sysparm_event');
			
			if (!sampleMap)
				sampleMap = JSON.parse(this.getParameter('sysparm_sampleMap'));
			
			if (!category || !point || !event || !sampleMap) {
				gs.error("category, point, event and sampleMap are required when sending analytics");
				return;
			}
			
			gs.log("Sending analytics for category: " + category);
			var sm = new GCFSampleMap();
			for (var key in sampleMap)
				sm.put('' + key, '' + sampleMap[key]);
			
			GCFCollector.recordUsageEvent('' + category, '' + point, '' + event, sm);
		} catch (error) {
			gs.error("Error sending usage analytics " + error);
		}
	},
    type: 'UpgradeCenterGCFAnalyticsAjax'
});
```
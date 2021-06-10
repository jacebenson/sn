---
title: "MLAnalytics"
id: "mlanalytics"
---

API Name: global.MLAnalytics

```js
var MLAnalytics = Class.create();
MLAnalytics.prototype = {
    initialize: function() {},

	trackAutoTraining : function (jsonObj) {
		jsonObj['event.type'] = 'ml.autotrain.usage';
		this.sendAnalytics(jsonObj);
	},
	
    sendAnalytics: function(jsonObj) {
		if (!jsonObj) {
			gs.info('MLAnalytics : Invalid json object');
			return;
		}
        var streamId = "snc.glide.platform_ml";
        var obfuscation_list = [];
        if (!AnalyticsFramework.isDisabled() && !AnalyticsFramework.isBlocked(streamId)) {
            openStatus = AnalyticsFramework.open(streamId);
            if (openStatus === 0) {
                jsonObj["app.name"] = "predictive_intelligence";
                AnalyticsFramework.sendJSON(streamId, obfuscation_list, JSON.stringify(jsonObj));
            }
            AnalyticsFramework.close(streamId);
        }
    },

    type: 'MLAnalytics'
};
```
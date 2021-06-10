---
title: "IBMWatsonNLUService"
id: "ibmwatsonnluservice"
---

API Name: global.IBMWatsonNLUService

```js
var IBMWatsonNLUService = Class.create();
IBMWatsonNLUService.prototype = Object.extendsObject(global.HttpNLUService, {
	initialize: function() {
		HttpNLUService.prototype.initialize.call(this);
		this._userId = gs.getProperty('com.glide.nlu.ibmwatson.intent.discovery.user_id', gs.getUserName());
	},

	preparePredictRequestBody: function(utterance) {
		return JSON.stringify(
			{
				"context": {
					"metadata": {
						"user_id": this._userId
					}
				},
				"input": {
					"text": utterance
				}
			});
	},

	type: 'IBMWatsonNLUService'
});
```
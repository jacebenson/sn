---
title: "MSLuisNLUService"
id: "msluisnluservice"
---

API Name: global.MSLuisNLUService

```js
var MSLuisNLUService = Class.create();
MSLuisNLUService.prototype = Object.extendsObject(global.HttpNLUService, {
	initialize: function() {
		HttpNLUService.prototype.initialize.call(this);
	},

	/**
	 * Overrides global.HttpNLUService.getPredictConnectionInfos()
	 */
	getPredictConnectionInfos: function(modelId, utterance) {
		var predictConnectionInfos = HttpNLUService.prototype.getPredictConnectionInfos.call(this, modelId, utterance);
		for (var i = 0; i < predictConnectionInfos.length; i++) {
			predictConnectionInfos[i].query_parameters = {'q': this._asString(utterance)};
		}
		return predictConnectionInfos;
	},

	/**
	 * Returns the intent label as the identifier of a predicted intent.
	 *
	 * @param intentId the id of the intent
	 * @param intentLabel the label of the intent
	 * @return the intent label
	 */
	getPredictedIntentIdentity: function(intentId, intentLabel) {
		return intentLabel;
	},

	/**
	 * Returns the entity label as the identifier of a predicted entity.
	 *
	 * @param entityId the id of the entity
	 * @param entityLabel the label of the entity
	 * @return the identity
	 */
	getPredictedEntityIdentity: function(entityId, entityLabel) {
		return entityLabel;
	},

	type: 'MSLuisNLUService'
});
```
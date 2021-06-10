---
title: "HttpNLUAdapter"
id: "httpnluadapter"
---

API Name: global.HttpNLUAdapter

```js
var HttpNLUAdapter = Class.create();
HttpNLUAdapter.prototype = {
	initialize: function() {
	},

	type: 'HttpNLUAdapter',

	/**
	 * Subclasses should override this function. The overridden function should adapt
	 * the external NLU provider's models object to a normalized models object in the
	 * following form:
	 * {"models": [{"name":name1, "id":id1}, {"name":name2, "id":id2}}]}
	 *
	 * @param externalNLUProviderModels
	 * @return {"models": [{"name":name1, "id":id1}, {"name":name2, "id":id2}}]}
	 * */
	toModels: function(externalNLUProviderModels) {},

	/**
	 * Subclasses should override this function. The overridden function should adapt
	 * the external NLU provider's intents object to a normalized model intents object in the
	 * following form:
	 * {"model_id": externalNLUProviderModelId, "intents": [{"name":name1, "id":id1}, {"name":name2, "id":id2}]}}
	 *
	 * @param externalNLUProviderModelId
	 * @param externalNLUProviderIntents
	 * @returns {"model_id": externalNLUProviderModelId, "intents": [{"name":name1, "id":id1}, {"name":name2, "id":id2}]}}
	 */
	toModelIntents: function(externalNLUProviderModelId, externalNLUProviderIntents) {},

	/**
	 * Subclasses should override this function. The overridden function should adapt
	 * the external NLU provider's entities object to a normalized model intents object in the
	 * following form:
	 * {"model_id": externalNLUProviderModelId, "scored_intents": [{"name":name1, "id":id1, "confidence":confidence}, {"name":name2, "id":id2, "confidence":confidence}], "scored_entities": [{"name":name1, "id":id1, "value":value,"confidence":confidence}, {"name":name2, "id":id2, "value":value, "confidence":confidence}]}}
	 *
	 * @param externalNLUProviderModelId
	 * @param externalNLUProviderEntities
	 * @returns {"model_id": externalNLUProviderModelId, "intents": [{"name":name1, "id":id1}, {"name":name2, "id":id2}]}}
	 */
	toModelEntities: function(externalNLUProviderModelId, externalNLUProviderEntities) {},

	/**
	 * Subclasses should override this function. The overridden function should adapt
	 * the external NLU provider's prediction result object to a normalized model prediction result object in the
	 * following form:
	 * {"model_id": externalNLUProviderModelId, "entities": [{"name":name1, "id":id1}, {"name":name2, "id":id2}]}}
	 *
	 * @param externalNLUProviderPredictionResult
	 * @param externalNLUProviderModelId
	 * @returns {"model_id": externalNLUProviderModelId, "scored_intents": [{"name":name1, "id":id1, "confidence":confidence}, {"name":name2, "id":id2, "confidence":confidence}], "scored_entities": [{"name":name1, "id":id1, "value":value,"confidence":confidence}, {"name":name2, "id":id2, "value":value, "confidence":confidence}]}}
	 */
	toPredictionResult: function(externalNLUProviderPredictionResult, modelId) {},

	toError: function(errorCode, errorMessage) {
		var errorType = 'SERVER_ERROR';
		if (errorCode === 400) {
			errorType = 'BAD_REQUEST';
		} else if (errorCode === 404) {
			errorType = 'NOT_FOUND';
		} else if (errorCode === 401 || errorCode === 403) {
			errorType = 'UNAUTHORIZED';
		}
		return {'type': errorType, 'message': errorMessage, 'provider_error': errorCode};
	}
};
```
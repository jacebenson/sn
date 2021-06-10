---
title: "MSLuisNLUAdapter"
id: "msluisnluadapter"
---

API Name: global.MSLuisNLUAdapter

```js
var MSLuisNLUAdapter = Class.create();
MSLuisNLUAdapter.prototype = Object.extendsObject(global.HttpNLUAdapter, {
	initialize: function() {
	},

	type: 'MSLuisNLUAdapter',

	toModels: function(msLuisApps) {
		if (gs.nil(msLuisApps) ||
			gs.nil(msLuisApps.length)) return;

		var models = [];
		for (var i = 0; i < msLuisApps.length; i++) {
			models.push(this._toModel(msLuisApps[i]));
		}

		return {'models': models};
	},

	toModelIntents: function(msLuisAppId, msLuisIntents) {
		var intents = [];
		if (!gs.nil(msLuisIntents) && !gs.nil(msLuisIntents.length)) {
			for (var i = 0; i < msLuisIntents.length; i++) {
				intents.push(this._toIntent(msLuisIntents[i]));
			}
		}
		return {'model_id': msLuisAppId, 'intents': intents};
	},

	toModelEntities: function(msLuisAppId, msLuisEntities) {
		var entities = [];
		if (!gs.nil(msLuisEntities) && !gs.nil(msLuisEntities.length)) {
			for (var i = 0; i < msLuisEntities.length; i++) {
				entities.push(this._toEntity(msLuisEntities[i]));
			}
		}
		return {'model_id': msLuisAppId, 'entities': entities};
	},

	toPredictionResult: function(msLuisPredictionResult, modelId) {
		var i = 0;

		var scoredIntents = [];
		for (i = 0; i < msLuisPredictionResult.intents.length; i++) {
			var msLuisIntent = msLuisPredictionResult.intents[i];
			scoredIntents.push({
				"name": msLuisIntent.intent,
				"id": msLuisIntent.intent,
				"confidence": msLuisIntent.score
			});
		}

		var scoredEntities = [];
		for (i = 0; i < msLuisPredictionResult.entities.length; i++) {
			var msLuisEntity = msLuisPredictionResult.entities[i];
			scoredEntities.push({
				"name": msLuisEntity.entity,
				"id": msLuisEntity.entity,
				"value": msLuisEntity.type,
				"confidence": msLuisEntity.score
			});
		}

		return {
			"model_id": modelId,
			"scored_intents": scoredIntents,
			"scored_entities": scoredEntities
		};
	},

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
	},

	_toModel: function(msLuisApp) {
		if (gs.nil(msLuisApp)) return;
		return {'name': msLuisApp.name, 'id': msLuisApp.id, 'language': msLuisApp.culture};
	},

	_toIntent: function(msLuisIntent) {
		if (gs.nil(msLuisIntent)) return;
		return {'name': msLuisIntent.name, 'id': msLuisIntent.id};
	},

	_toEntity: function(msLuisEntity) {
		if (gs.nil(msLuisEntity)) return;
		return {'name': msLuisEntity.name, 'id': msLuisEntity.id};
	}
});
```
---
title: "IBMWatsonNLUAdapter"
id: "ibmwatsonnluadapter"
---

API Name: global.IBMWatsonNLUAdapter

```js
var IBMWatsonNLUAdapter = Class.create();
IBMWatsonNLUAdapter.prototype = Object.extendsObject(global.HttpNLUAdapter, {
	initialize: function() {
	},

	type: 'IBMWatsonNLUAdapter',

	toModels: function(ibmWorkspaces) {
		if (gs.nil(ibmWorkspaces) ||
			gs.nil(ibmWorkspaces.workspaces) ||
			gs.nil(ibmWorkspaces.workspaces.length)) return;

		var models = [];
		for (var i = 0; i < ibmWorkspaces.workspaces.length; i++) {
			var workspace = ibmWorkspaces.workspaces[i];
			if (workspace.name === 'Base')
				continue;
			models.push(this._toModel(workspace));
		}

		return {'models': models};
	},

	toModelIntents: function(ibmWorkspaceId, ibmIntents) {
		var intents = [];
		if (!gs.nil(ibmIntents) && !gs.nil(ibmIntents.intents.length)) {
			for (var i = 0; i < ibmIntents.intents.length; i++) {
				intents.push(this._toIntent(ibmIntents.intents[i]));
			}
		}
		return {'model_id': ibmWorkspaceId, 'intents': intents};
	},

	toModelEntities: function(ibmWorkspaceId, ibmEntities) {
		var entities = [];
		if (!gs.nil(ibmEntities) && !gs.nil(ibmEntities.entities.length)) {
			for (var i = 0; i < ibmEntities.entities.length; i++) {
				entities.push(this._toEntity(ibmEntities.entities[i]));
			}
		}
		return {'model_id': ibmWorkspaceId, 'entities': entities};
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

	toPredictionResult: function(ibmPredictionResult, modelId) {
		var i = 0;

		var scoredIntents = [];
		for (i = 0; i < ibmPredictionResult.intents.length; i++) {
			var ibmIntent = ibmPredictionResult.intents[i];
			scoredIntents.push({
				"name": ibmIntent.intent,
				"id": ibmIntent.intent,
				"confidence": ibmIntent.confidence
			});
		}

		var scoredEntities = [];
		for (i = 0; i < ibmPredictionResult.entities.length; i++) {
			var ibmEntity = ibmPredictionResult.entities[i];
			scoredEntities.push({
				"name": ibmEntity.entity,
				"id": ibmEntity.entity,
				"value": ibmEntity.value,
				"confidence": ibmEntity.confidence
			});
		}

		return {
			"model_id": modelId,
			"scored_intents": scoredIntents,
			"scored_entities": scoredEntities
		};
	},

	_toModel: function(ibmWorkspace) {
		if (gs.nil(ibmWorkspace)) return;
		return {
			'name': ibmWorkspace.name,
			'id': ibmWorkspace.workspace_id,
			'language': ibmWorkspace.language
		};
	},

	_toIntent: function(ibmIntent) {
		if (gs.nil(ibmIntent)) return;
		return {'name': ibmIntent.intent, 'id': ibmIntent.intent};
	},

	_toEntity: function(ibmEntity) {
		if (gs.nil(ibmEntity)) return;
		return {'name': ibmEntity.entity, 'id': ibmEntity.entity};
	}
});
```
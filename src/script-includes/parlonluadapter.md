---
title: "ParloNLUAdapter"
id: "parlonluadapter"
---

API Name: global.ParloNLUAdapter

```js
var ParloNLUAdapter = Class.create();
ParloNLUAdapter.prototype = {
    initialize: function() {
    },

    getModels: function (parloModelsJSON) {
		if (gs.nil(parloModelsJSON))
			return {
            'models': []
        };
        var modelsArray = JSON.parse(parloModelsJSON);
        var modelsArrayFormatted = [];
        for (var i = 0; i < modelsArray.length; i++) {
			if (modelsArray[i] && modelsArray[i].id && modelsArray[i].name) {
				modelsArrayFormatted.push(this._toModel(modelsArray[i]));
			}
        }
        return {
            'models': modelsArrayFormatted
        };
    },
    getEntities: function (modelId, parloEntitiesJSON) {
		if (gs.nil(parloEntitiesJSON))
			return {
            'model_id': modelId,
            'entities': []
        };

        var entitiesByModelIdArray = JSON.parse(parloEntitiesJSON);

        var entitiesArrayFormatted = [];
        for (var i = 0; i < entitiesByModelIdArray.length; i++) {
            entitiesArrayFormatted.push(this._toEntity(entitiesByModelIdArray[i]));
        }
        return {
            'model_id': modelId,
            'entities': entitiesArrayFormatted
        };
    },
    getIntents: function (modelId,parloIntentsJSON) {
        if (gs.nil(parloIntentsJSON))
			return {
            'model_id': modelId,
            'intents': []
        };

        var intentsArray = JSON.parse(parloIntentsJSON);
        var intentsArrayFormatted = [];
        for (var i = 0; i < intentsArray.length; i++) {
            intentsArrayFormatted.push(this._toIntent(intentsArray[i]));
        }
        return {
            'model_id': modelId,
            'intents': intentsArrayFormatted
        };
    },
    predict: function (modelId,parloPredictionResultJSON) {
		if (gs.nil(parloPredictionResultJSON))
			return {
            "model_id": modelId,
            "scored_intents": [],
            "scored_entities": []
        };

	var parloPredictionResult = JSON.parse(JSON.parse(parloPredictionResultJSON));
        if (parloPredictionResult.status == "failure")
            return this._toError(parloPredictionResult.response);
        var scoredIntents = [];
        var scoredEntities = [];
        for (var i = 0; i < parloPredictionResult.response.intents.length; i++) {
            var intent = parloPredictionResult.response.intents[i];
            scoredIntents.push({
                "name": intent.intentName,
                "id": intent.intentName,
                "confidence": intent.score
            });
            this._fillScoredEntities(intent.entities, scoredEntities);
        }
        this._fillScoredEntities(parloPredictionResult.entities, scoredEntities);
        return {
            "model_id": modelId,
            "scored_intents": scoredIntents,
            "scored_entities": scoredEntities
        };
    },

    _toError: function (errorMessage) {
        return {
            'message': errorMessage
        };
    },
     _toModel: function (modelObj) {
        if (gs.nil(modelObj)) return;
		var name=modelObj.name;
		if(modelObj.hasOwnProperty('displayName'))
			name=modelObj.displayName;
        return {
            'name': name,
            'id': modelObj.name,
 			'language': modelObj.language,
			'scope': modelObj.scope
        };
    },
    _toIntent: function (intentObj) {
        if (gs.nil(intentObj)) return;
        return {
            'name': intentObj.name,
            'id': intentObj.name,
            'sys_id': intentObj.id
        };
    },
    _toEntity: function (entityObj) {
        if (gs.nil(entityObj)) return;
        return {
            'name': entityObj.name,
            'id': entityObj.name
        };
    },
    _fillScoredEntities: function (entities, scoredEntities) {
        for (i = 0; i < entities.length; i++) {
            var entity = entities[i];
            var entityName = entity.name.split('.').pop();
            scoredEntities.push({
                "name": entityName,
                "id": entityName,
                "value": entity.normalization ? entity.normalization.value :  entity.value,
                "confidence": entity.score
            });
        }
    },
    type: 'ParloNLUAdapter'
};
```
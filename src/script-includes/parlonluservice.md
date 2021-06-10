---
title: "ParloNLUService"
id: "parlonluservice"
---

API Name: global.ParloNLUService

```js
var ParloNLUService = Class.create();
ParloNLUService.prototype = {
	initialize: function() {
		this._nluStudioUtil = new global.NLUStudioUtil();
		this._adapter = new global.ParloNLUAdapter();
	},

	getModels: function () {
		return this._adapter.getModels(JSON.stringify(this._nluStudioUtil.getAllPublishedModels()));
	},

	getEntities: function(modelId, intentId) {
		if (gs.nil(modelId) && gs.nil(intentId)) {
			return;
		}

		var entities = this._nluStudioUtil.getEntitesByModel(modelId, false);
		var systemEntities=this._nluStudioUtil.getSystemEntitesByModel(modelId, false);
		entities=entities.concat(systemEntities);
		if (!gs.nil(intentId)) {
			entities = this._nluStudioUtil.getEntitesByIntent(intentId,modelId,false).concat(entities);
		}
		return this._adapter.getEntities(modelId, JSON.stringify(entities));
	},

	getIntents: function(modelId) {
		return this._adapter.getIntents(modelId, JSON.stringify(this._nluStudioUtil.getIntents(modelId, false)));
	},

	predict: function(modelId, utterance, preferredModel, preferredIntent) {
		if (gs.nil(utterance) && gs.nil(modelId)) {
			return;
		}

		var intentProp = gs.getProperty('com.glide.cs.intent_confidence_threshold',"0.40");
		var entityProp = gs.getProperty("com.glide.cs.entity_confidence_threshold","0.40");
		var inputJson = {
			"utterance": utterance
		};
		var scopeId = gs.getCurrentApplicationId();

		var nluModelRec = new GlideRecord("sys_nlu_model");
		if(nluModelRec.get('name', modelId)){
			scopeId = nluModelRec.getValue('sys_scope') || 'global';
		}

		var model = [{
			"solutionName": modelId,
			"solutionScope": scopeId,
			"requestMode": "active"
		}];
		var currDate = (new Date()).toJSON();
		var options = {
			clientRequestTime: currDate.split('T')[0]
		};
		if (preferredIntent && preferredIntent.length > 0) {
			options.preferredIntentCtx = preferredModel + "." + preferredIntent;
		}

		var predictionResults = sn_ml.MLServiceUtil.predict(JSON.stringify(model),JSON.stringify(inputJson), options);
		return this._adapter.predict(modelId,JSON.stringify(predictionResults));
	},

	preparePredictRequestBody: function(utterance,modelId) {
		return JSON.stringify({"utterance": utterance, "modelId":modelId});
	},

	type: 'ParloNLUService'
};
```
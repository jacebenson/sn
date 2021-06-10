---
title: "AgentAssistRecommendationHelper"
id: "agentassistrecommendationhelper"
---

API Name: sn_agent_recommend.AgentAssistRecommendationHelper

```js
var AgentAssistRecommendationHelper = Class.create();

AgentAssistRecommendationHelper.prototype = {

	initialize: function() {},
	
	getRecommendation: function(requestTable, uiType, formId) {
		if (!requestTable || !uiType)
			return false;
		
		this.requestTable = requestTable;
		this.uiType = uiType;
		this.recommendationFound = false;
		this.trendRecommResult = {};
		this.trendResult = {};
		this.formGr = this._getFormGr(formId);
		this.variableInMsg = {};
		this.trendRecommId = "";
		
		var aar = this._getAgentAssistRecommendations();
		if (!aar)
			return null;
		
		while (!this.recommendationFound && aar.next()) {
			var solutionId = aar.getValue('ml_capability_definition');
			var solutionName = this._getSolutionName(solutionId);
			
			var MLResult = this._callMLApi(solutionName);
			if (!MLResult || MLResult.length == 0)
				continue;
			
			var formattedMLResult = this._formatMLResult(MLResult);
			if (!formattedMLResult || formattedMLResult.length === 0)
				continue;

			var trendRecommGr = this._getTrendRecommendation(aar);
			if (!trendRecommGr)
				continue;

			while (trendRecommGr.next()) {
				var matches = GlideFilter.checkRecord(this.formGr, trendRecommGr.display_condition);
				if (!matches)
					continue;
				
				var recordsForTrend = formattedMLResult;
				this.variableInMsg = {};
				this.trendRecommId = trendRecommGr.getUniqueValue();

				if (trendRecommGr.getDisplayValue("advanced") === "true") {
					var evaluator = new GlideScopedEvaluator();
					evaluator.putVariable('MLResults', formattedMLResult);
					var result = evaluator.evaluateScript(trendRecommGr, 'script', null);  // result with format of {abort: xxx, recordsForTrend: xxx, varForMsg: xxx}
					if (result.abort !== false)
						continue;

					recordsForTrend = result.recordsForTrend;
					this.variableInMsg = result.varForMsg;
				}
				
				if (!recordsForTrend || recordsForTrend.length == 0)
					continue;
				this.trendResult = this._callTrendApi(recordsForTrend, trendRecommGr.trend_definition.trend_id + '');
				if (!this.trendResult || this.trendResult.state.toLowerCase() != 'successful' || this.trendResult.results.length == 0)
					continue;

				this.recommendationFound = true;
				break;
			}
		}

		this.trendRecommResult = {
			trendRecommId: this.trendRecommId,
			variableInMsg: this.variableInMsg,
			trendResult: this.trendResult
		};

		return JSON.stringify(this.trendRecommResult);
	},
	
	_callMLApi: function(solutionName) {
		if (!solutionName)
			return null;
			
		var predictor = new global.MLPredictor();
		var solution = predictor.findActiveSolution(solutionName);
		if (!solution) 
			return null;
		
		var MLresult = predictor.getPredictions(this.formGr, solution); //Threshold is default which is 1
		if (!MLresult || MLresult.length == 0)
			return null;

		return MLresult;
	},
	
	_formatMLResult: function(MLResult) {
		if (!MLResult || MLResult.length == 0)
			return null;

		var recordIds = [];
		for (var i = 0; i < MLResult.length; i++) {
			if (!MLResult[i].hasPrediction())
				continue;
			
			var recordId = (MLResult[i].predictedValue() && MLResult[i].predictedValue().length === 32) ? MLResult[i].predictedValue(): MLResult[i].predictedValueSysId();
			recordIds.push(recordId);
		}
		return recordIds;
	},
	
	_callTrendApi: function(recordList, trendId) {
		if (!recordList || recordList.length == 0 || !trendId)
			return null;

		var trendRequest = this._getTrendRequest(recordList, trendId);
		if (!trendRequest)
			return null;
		
		var trendResult = new sn_intel_analyzer.TrendRecommendation().processTrends(trendRequest);
		return trendResult;
	},

	_getTrendRequest: function(recordList, trendId) {
		var trendRequest = {};
		trendRequest.request_table = this.requestTable;
		trendRequest.trend_list = [trendId];
		trendRequest.record_list = recordList;
		return trendRequest;
	},
	
	_getTableConfig: function() {
		var tableConfig = new GlideRecord('cxs_table_config');
		tableConfig.addActiveQuery();
		tableConfig.addQuery('table', this.requestTable);
		tableConfig.addQuery('ui_type', this.uiType);
		tableConfig.setLimit(1);
		tableConfig.query();
		return tableConfig.next() ? tableConfig : null;
	},
	
	_getAgentAssistRecommendations: function() {
		var tableConfig = this._getTableConfig();
		if (!tableConfig || !tableConfig.isValidRecord())
			return false;
		var aar = new GlideRecord('agent_assist_recommendation');
		aar.addQuery('table_config', tableConfig.getUniqueValue());
		aar.addActiveQuery();
		aar.orderBy('order');
		aar.query();
		return aar;
	},
	
	_getSolutionName: function(solutionId) {
		var gr = new GlideRecord('ml_capability_definition_base');
		return gr.get(solutionId) ? gr.getValue('solution_name') : '';
	},
	
	_getTrendRecommendation: function(aar) {
		var trendRec = new GlideRecord('trend_recommendation');
		trendRec.addQuery("agent_assist_recommendation", aar.getUniqueValue());
		trendRec.orderBy("order");
		trendRec.query();
		return trendRec.hasNext() ? trendRec : null;
	},
	
	_getFormGr: function(formId) {
		var gr = new GlideRecord(this.requestTable);
		if (formId)
			gr.get(formId);
		return (formId && gr.get(formId)) ? gr : new GlideRecord(this.requestTable);
	},

	type : 'AgentAssistRecommendationHelper'
};
```
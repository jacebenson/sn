---
title: "cxs_MLSearchHelper"
id: "cxs_mlsearchhelper"
---

API Name: global.cxs_MLSearchHelper

```js
var cxs_MLSearchHelper = Class.create();
cxs_MLSearchHelper.prototype = Object.extendsObject(cxs_BaseMLHelper, {
	DEFAULT_THRESHOLD: 1,
	TABLE_ML_SOLUTION_DEFINITION: 'ml_capability_definition_base',
	
	processSearch: function () {
		//gs.log('******* inputs' + arguments[0]);
		var inputs = JSON.parse(arguments[0]);
		
		//Initialize
		if (!inputs['tableName'] || !inputs['solutionDefinition'])
			return;
		
		this.threshold = this.DEFAULT_THRESHOLD;
		this.solutionName = this.getSolutionName(inputs['solutionDefinition'].toString());
		this.tableName = inputs['tableName'].toString();
		this.count = Number(inputs['count'] ? inputs['count'].toString() : this.DEFAULT_COUNT) + 1;
		
		//gs.log('******* this.threshold' + this.threshold + this.tableName + this.count + this.request.formId + this.request.formTable + this.request.uiType);
		
		//Cannot do ML search if there are no form details
		if (!this.request.formId || !this.request.formTable || !this.solutionName)
			return;
		
		var formGr = this.getFormGr();
		
		//Invalid form details
		if (!formGr)
			formGr = new GlideRecord(this.request.formTable);
		
		formGr = this.updateSearchText(formGr);
		// Empty search text for now should not go to ML API
		if (!formGr)
			return;

		//Call ML serivce
		var MLResults = this.callMLService(formGr);
		
		while (this.response.results.length < this.count) {
			//Return if no results
			if (!MLResults || MLResults.length <= 0)
				return;
			
			//Process results from ML predictions
			this.processResults(MLResults);
		}
		//gs.log('********* response *********' + JSON.stringify(this.response));
	},
	
	updateSearchText: function (formGr) {
		var searchText = this.getSearchText();
		if (!searchText)
			return null;

		var fieldGr = this.getTableConfigDefaultField();
		var currentSearchField = this.getCurrentSearchField();
		//gs.log('******* fieldGr.field' + fieldGr.field);
		//gs.log('******* currentSearchField' + currentSearchField + formGr.isValidField(currentSearchField));
		if (currentSearchField && formGr.isValidField(currentSearchField))
			formGr.setValue(currentSearchField, searchText);
		else if (fieldGr && fieldGr.field && formGr.isValidField(fieldGr.field))
			formGr.setValue(fieldGr.field, searchText);

		return formGr;
	},
	
	getSearchText: function () {
		return this.request.query && this.request.query.freetext ? this.request.query.freetext : '';
	},
	
	getTableConfigDefaultField: function () {
		var tableConfig = this.getTableConfig();
		if (tableConfig) {
			return this.getDefaultField(tableConfig.sys_id);
		}
		return '';
	},
	
	getCurrentSearchField: function () {
		return this.request.meta && this.request.meta['sourceField'];
	},
	
	getSolutionName: function(defn) {
		var gr = new GlideRecord(this.TABLE_ML_SOLUTION_DEFINITION);
		if (gr.get(defn)) {
			return gr.getValue('solution_name');
		}
		return null;
	},
	
	getFormGr: function () {
		var gr = new GlideRecord(this.request.formTable);
		if (gr.get(this.request.formId)) {
			return gr;
		}
		return null;
	},
	
	callMLService: function (formGr) {
		var predictor = new MLPredictor();
		var info = "";
		var solution = predictor.findActiveSolution(this.solutionName);
		if (!solution)
			return;
		var outcomeArray = predictor.getPredictions(formGr, solution); //Threshold is default which is 1
		return outcomeArray;
	},
	
	processResults: function (results) {
		var currentSetResults = results.splice(0, this.count+1);
		var formatedResults = this.formatResults(currentSetResults);
		//var formatedResults = this.formatResultsDummyData(); //Until ML API is available
		var sysIdsInOrder = formatedResults.sysIdsInOrder;
		if (sysIdsInOrder && sysIdsInOrder.length > 0) {
			// Get records that are readable by the user
			var resultsGr = this.getResultsGr(sysIdsInOrder);
			if (resultsGr.hasNext()) {
				// Assimilate response
				this.assimilateResults(formatedResults.resultsJson, resultsGr, sysIdsInOrder);
			} 
		}
	},
	
	formatResults: function (results) {
		var resultsJson = {};
		var sysIdsInOrder = [];
		if (results) {
			for (var i=0; i< results.length; i++) {
				if (results[i].hasPrediction()) {
					var predictionObj = {};
					var sysId = results[i].predictedValue().length === 32 ? results[i].predictedValue(): results[i].predictedValueSysId();
					predictionObj['predictedValue'] = results[i].predictedValue(); //int/case number
					predictionObj['predictedValueSysId'] = sysId; //sys_id for similarity
					predictionObj['confidence'] = results[i].confidence(); //similarity score
					resultsJson[sysId] = predictionObj;
					sysIdsInOrder.push(sysId);
				}
			}
		}
		return {'sysIdsInOrder': sysIdsInOrder, 'resultsJson': resultsJson};
	},
			
	getResultsGr: function (sysIds) {
		var gr = new GlideRecordSecure(this.tableName);
		gr.addQuery('sys_id', 'IN', sysIds);
		gr.query();
		return gr;
	},

	assimilateResults: function (formatedResults, resultsGr, sysIdsInOrder) {
		if (!formatedResults)
			return;

		var combinedResults = {};
		while (resultsGr.next()) {
			var sysId = resultsGr.getUniqueValue();
			if (sysId === this.request.formId)
				continue;

			var srdc = new SNC.SearchResultDisplayConfiguration(resultsGr.getTableName(), this.request.getUiType(), this.request.getFormTable());
			var res = new SNC.SearchResult();
			res[this.RESULT_TITLE] = srdc.getCardTitle(resultsGr);
			res[this.RESULT_SNIPPET] = srdc.getCardSnippet(resultsGr);
			res[this.ID] = resultsGr.getTableName() + ':' + resultsGr.getUniqueValue();
			if(resultsGr.getTableName() === 'kb_knowledge')
				res[this.RESULT_LINK] = "kb_view.do?sysparm_article="+resultsGr.getValue('number');
			else 
				res[this.RESULT_LINK] = resultsGr.getLink();
			res.meta[this.META_SCORE] = -1;
			res.meta[this.CONFIDENCE] = formatedResults[this.CONFIDENCE];
			res.meta.setDisplayConfiguration(srdc, resultsGr);
			combinedResults[sysId] = res;
		}

		for (var i = 0; i < sysIdsInOrder.length; i ++) {
			if (sysIdsInOrder[i] === this.request.formId)
				continue;

			var searchResult = combinedResults[sysIdsInOrder[i]];
			this.response.results.push(searchResult);
			if (this.response.results.length >= this.count)
				break;
		}
	},

	type: 'cxs_MLSearchHelper'
});
```
---
title: "ClassificationBubbleChartHelper"
id: "classificationbubblecharthelper"
---

API Name: sn_ml_ui.ClassificationBubbleChartHelper

```js
var ClassificationBubbleChartHelper = Class.create();
ClassificationBubbleChartHelper.prototype = {

	initialize: function () {
		this.ML_CLASS_CONFIDENCE_TABLE = 'ml_class';
		this.CLASS_DISTRIBUTION = 'distribution';
		this.CLASS_PRECISION = 'precision';
		this.CLASS_RECALL = 'recall';
		this.CLASS_COVERAGE = 'coverage';
		this.CLASS_SOLUTION_SYSID = 'solution';
		this.CLASS_NAME = 'name';
	},
	_isPreOrlando: function (solutionSysId) {
		var solutionGR = new GlideRecord('ml_solution');
		solutionGR.get(solutionSysId);
		var capabilityVersion = parseFloat(solutionGR.getValue('capability_version'));
		if(capabilityVersion < 5.0)
			return true;
		return false;		
	},
	
	getData: function (solutionSysId) {
		var mlSolutionInfo = {};
		
		var recallExists =  this._isPreOrlando(solutionSysId) ? 'false' : 'true';
		mlSolutionInfo.recallExists = recallExists;

		var mlClassCategories = [];
		var gr = new GlideRecordSecure(this.ML_CLASS_CONFIDENCE_TABLE);
		gr.addQuery(this.CLASS_SOLUTION_SYSID, solutionSysId);
		gr.orderByDesc(this.CLASS_DISTRIBUTION);
		gr.query();
		while (gr.next()) {
			var mlClassCategory = {};
			mlClassCategory.precision = gr.pc_lookup.getRefRecord().getValue(this.CLASS_PRECISION);
			mlClassCategory.coverage = gr.pc_lookup.getRefRecord().getValue(this.CLASS_COVERAGE);
			mlClassCategory.recall = recallExists === 'false' ? '-1' : gr.pc_lookup.getRefRecord().getValue(this.CLASS_RECALL);
			mlClassCategory.distribution = gr.getValue(this.CLASS_DISTRIBUTION);
			mlClassCategory.class_name = gr.getValue(this.CLASS_NAME);
			mlClassCategories.push(mlClassCategory);
		}
		
		mlSolutionInfo.mlClassCategories = mlClassCategories;
		return mlSolutionInfo;
	},
	type: 'ClassificationBubbleChartHelper'
};

```
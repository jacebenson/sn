---
title: "MLSolutionResult"
id: "mlsolutionresult"
---

API Name: global.MLSolutionResult

```js
var MLSolutionResult = Class.create();
MLSolutionResult.prototype = {
	ML_CAPABILITY_DEFINITION_BASE: 'ml_capability_definition_base',
	ML_SOLUTION: 'ml_solution',
	ML_CLUSTER_SUMMARY: 'ml_cluster_summary',
	ML_CLUSTER_DETAIL: 'ml_cluster_detail',
	
    initialize: function() {
    },

	findActiveSolution: function(solutionName) {
		var solutionDef = new GlideRecordSecure(this.ML_CAPABILITY_DEFINITION_BASE);
		solutionDef.addQuery('solution_name', solutionName); 
		solutionDef.addActiveQuery(); 
		solutionDef.query();
		if(!solutionDef.next()) {
			return null;
		}
		
		var solution = new GlideRecordSecure(this.ML_SOLUTION);
		solution.addQuery('ml_capability_definition', solutionDef.getUniqueValue());
		solution.addActiveQuery();
		solution.query();
		
		if (solution.next()) {
			return solution;
		}
		
		return null;
	},
	
	getClusterInfo: function(solutionName, options) {
		var outcomeArr = [];
		
		try {
			var solution = this.findActiveSolution(solutionName);
			if (solution === null) {
				gs.addErrorMessage(solutionName + " is not a valid solution name or is not active");
				return;
			}
			
			var isClusteringSolution = this.isClusteringSolution(solution);
			if (!isClusteringSolution) {
				gs.addErrorMessage("getClusterInfo(solutionName) is only applicable for clustering solution");
				return;
			}
			
			options = options || {};

			var segmentation_field = options.segmentation_field;
			var cluster_id = options.cluster_id;
			var gr = new GlideRecordSecure(this.ML_CLUSTER_SUMMARY);
			gr.addQuery('solution', solution.getUniqueValue());
			if (segmentation_field) {
				gr.addQuery('segmentation_val', segmentation_field);
			}
			if (cluster_id) {
				gr.addQuery('sys_id', cluster_id);
			}
			gr.query();
			while (gr.next()) {
				var outcomeObj = {};
				outcomeObj.cluster_num = gr.getValue('cluster_id');
				outcomeObj.segmentation = gr.getValue('segmentation_val');
				outcomeObj.total_members = gr.getValue('cluster_size');
				outcomeObj.cluster_quality = gr.getValue('cluster_quality');
				outcomeArr.push(outcomeObj);
			}
		} catch (e) {
			gs.logError("Exception caught: "+e, 'MLSolutionResult');
		}
		
		return outcomeArr;
	},
	
	getClusterAssignments: function(solutionName, options) {
		var outcomeArr = [];
		
		try {
			var solution = this.findActiveSolution(solutionName);
			if (solution === null) {
				gs.addErrorMessage(solutionName + " is not a valid solution name or is not active");
				return;
			}
			
			var isClusteringSolution = this.isClusteringSolution(solution);
			if (!isClusteringSolution) {
				gs.addErrorMessage("getClusterAssignments(solutionName, options) is only applicable for clustering solution");
				return;
			}
			
			options = options || {};

			var gr = new GlideRecord(this.ML_CLUSTER_DETAIL);
			gr.addQuery('solution', solution.getUniqueValue());
			var segmentation_field = options.segmentation_field;
			var cluster_id = options.cluster_id;
			var recSysId = options.rec_sys_id;
			if (segmentation_field) {
				gr.addQuery('segmentation_val', segmentation_field);
			}
			if (cluster_id) {
				gr.addQuery('cluster_id', cluster_id);
			}
			if (recSysId) {
				gr.addQuery('rec_sys_id', recSysId);
			}
			gr.query();

			while (gr.next()) {
				var outcomeObj = {};
				outcomeObj.cluster_num = gr.getDisplayValue('cluster_id');
				outcomeObj.segmentation = gr.getValue('segmentation_val');
				outcomeObj.rec_sys_id = gr.getValue('rec_sys_id');
				outcomeObj.rec_display_id = gr.getDisplayValue('rec_sys_id');
				outcomeArr.push(outcomeObj);
			}
		} catch (e) {
			gs.logError("Exception caught: "+e, 'MLSolutionResult');
		}
		
		return outcomeArr;
	},
	
	/**
	 * Returns true if the input solution is of type clustering, otherwise returns false
	 */
	isClusteringSolution: function(solution) {
		var capability = solution.capability;
		return JSUtil.notNil(capability) && capability == 'clustering_trainer';
	},
	
	type: 'MLSolutionResult'
};
```
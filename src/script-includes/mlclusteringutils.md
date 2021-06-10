---
title: "MLClusteringUtils"
id: "mlclusteringutils"
---

API Name: global.MLClusteringUtils

```js
var MLClusteringUtils = Class.create();
MLClusteringUtils.prototype = {
    initialize: function() {
    },

    type: 'MLClusteringUtils',
	
	deleteClusterAssignments: function(solutionName, age) {
		//age as the parameter at the minute level
		var milliSecsInDay = age*60*1000;
		var gdt = new GlideDateTime();
		//move date behind by 24hrs
		gdt.subtract(milliSecsInDay);
		//convert to UTC
		gdt.subtract(gdt.getTZOffset());
		var options = {
			"updatedUntil": new String(gdt.getDisplayValueWithoutTZ())
		};
		var mlSolution = sn_ml.ClusteringSolutionStore.get(solutionName);
		var mlSolutionVersion = mlSolution.getActiveVersion();
		mlSolutionVersion.deleteClusterAssignments(options);
	},
	
	deleteUnavailableClusterModels: function(age) {
		//keep 1 week's history
		var milliSecsInDay = 1*7*86400*1000;
		var gdt = new GlideDateTime();
		//move date behind by 24hrs
		gdt.subtract(milliSecsInDay);
		//convert to UTC
		gdt.subtract(gdt.getTZOffset());
		var options = {
			"updatedUntil": new String(gdt.getDisplayValueWithoutTZ())
		};
		var gr = new GlideRecord('ml_capability_definition_clustering');
		gr.addQuery('request_source', 'api');
		gr.query();
		while (gr.next()) {
			try {
				var solutionName = gr.getValue('solution_name');
				var mlSolution = sn_ml.ClusteringSolutionStore.get(solutionName);
				var mlSolutionVersion = mlSolution.getActiveVersion();
				mlSolutionVersion.deleteUnavailableClusterModels(options);
			} catch (ex) {
				gs.print('Exception caught: '+ ex.getMessage());
			}
		}
	}
};
```
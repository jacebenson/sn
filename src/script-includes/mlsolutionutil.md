---
title: "MLSolutionUtil"
id: "mlsolutionutil"
---

API Name: global.MLSolutionUtil

```js
var MLSolutionUtil = Class.create();
MLSolutionUtil.prototype = {
    initialize: function() {
    },

	/**
 	* getPredictions method is used to get ML predictions
 	* Input Parameters (injected into the method) are:
	* 'input' - input can be GlideRecord or array of key-value pairs
 	* 'solutionNames' - array of names of solution against which prediction needs to be run
 	* Output - {JSON}
	* Output format - 
	* { 
	*   solution_name :  {
	*		input_gr_sys_id1/record_number : [
	*						{
	*						  predictedValue : ,
	*						  predictedSysId : ,
	*						  confidence : ,
	*						  threshold : 
	*						},    
	*						{
	*						  predictedValue : "",
	*						  predictedSysId : "",
	*						  confidence : "",
	*						  threshold : ""
	*						}
	*			]
	*		}
	*	}
 	*/
    getPredictions: function(input, solutionNames, options) {
		var predResults = {};
		for (var index=0; index < solutionNames.length; index++) {
			var solutionName = solutionNames[index];
			var mlSolution = sn_ml.MLSolutionFactory.getSolution(solutionName);
			predResults[solutionName] = JSON.parse(mlSolution.predict(input, options));
		}
		return predResults;
    },

    type: 'MLSolutionUtil'
};
```
---
title: "MLPredictor"
id: "mlpredictor"
---

API Name: global.MLPredictor

```js
var MLPredictor = Class.create();
MLPredictor.prototype = {
	ML_SOLUTION_DEFINITION : 'ml_solution_definition',
	ML_CAPABILITY_DEFINITION_BASE : 'ml_capability_definition_base',
	CAPABILITY_CLASSIFICATION : 'classification_trainer',
	CAPABILITY_SIMILARITY : 'similarity_trainer',
	CAPABILITY_CLUSTERING : 'clustering_trainer',
	CAPABILITY_REGRESSION : 'regression_trainer',

    initialize: function() {
    },

    type: 'MLPredictor',
	
	/**
	 * Return the solution object for specified solutionName
	 * Only the solution definition and the solution both are active, return solution or return null
	 */
	findActiveSolution: function(solutionName) {
		var solutionDef = new GlideRecord(this.ML_CAPABILITY_DEFINITION_BASE); 
		solutionDef.addQuery('solution_name', solutionName); 
		solutionDef.addActiveQuery(); 
		solutionDef.query();
		if(!solutionDef.next()) {
			return null;
		}
		
		var finder = new sn_ml.SolutionFinder();
		
		var solution = finder.getSolution(solutionName);
		if (gs.nil(solution)) {
			return null;
		}
		
		if (!solution.isActive()) {
			return null;
		}
		
		return solution;
	},	
	
	/**
	 * Return array of solution objects which represent applicable active solutions for table the specified
	 * record is for
	 */
	findActiveSolutionsForRecord: function(gr) {
		var finder = new sn_ml.SolutionFinder();
		var solutions = finder.findActiveSolutionsForRecord(gr);

		return solutions;
	},
	
	/**
	 * Apply predicted values from specified solutions (an array) to specified record gr.
	 */
	applyPrediction: function(gr, solutions) {
		for (var i = 0; i < solutions.length; ++i)
			this.applyPredictionForSolution(gr, solutions[i]);
	},
	
	/**
	 * Apply predicted value from specified solution to specified record gr.
	 * Return true if the prediction happened.
	 */	
	applyPredictionForSolution: function(gr, solution) {
		if (this.validSolutionCapability(solution)!==this.CAPABILITY_CLASSIFICATION) {
			gs.addErrorMessage("applyPredictionForSolution(gr, solution) is only applicable for classification solution");
			return;
		}
		var outcome = solution.predict(gr);
		if (!outcome.hasPrediction()) {
			var errorMessage = gs.getMessage("Can't predict {0}", outcome.toJSONString());
			gs.addErrorMessage(errorMessage);
			return false;
		}

		var predictedValue = this.getPredictedValue(solution, outcome);
		var predictedValueSysId = outcome.predictedValueSysId();

		var isPredicted = this.__applyPredictedValue(gr, solution, predictedValue, predictedValueSysId);

		// Record the prediction stat
		sn_ml.SolutionStats.recordPredictValues(outcome, solution);

		return isPredicted;
	},
	
	/**
	 * Return the predicted value for specified solution based on the specified outcome of
	 * prediction. If confidence of prediction does not satisfy thresholds, return null.
	 */
	getPredictedValue: function(solution, outcome) {
		var predictedValue = outcome.predictedValue();
		if (predictedValue === null) {
			return null;
		}
		
		var threshold = this.__getPredictionThreshold(solution, outcome);
	
		// Set the value for the predicted field
		if (outcome.confidence() >= threshold)
			return predictedValue;
		
		return null;
	},

	
	/**
	 * gr: Glide record to be predicted
	 * solution: Solution object to be executed
	 * options.top_n: (Optional) if provided returns results upto topN, 
	 * otherwise default will be read from property "glide.platform_ml.max_num_predictions"
	 * options.apply_threshold:  (Optional) checks the threshold value (solution threshold for similarity, 
	 * class level threshold for classification) 
	 * for the solution and applies on result set. default value is true
	 */
getPredictions: function(gr, solution, options) {
		//getting topN predictions
		var outcomeArr = [];
		
		try{
			options = options || {};
	
			var topN = options.top_n;
			var applyThreshold = options.apply_threshold;
			
			if (this.validSolutionCapability(solution)===this.CAPABILITY_REGRESSION || this.validSolutionCapability(solution)===this.CAPABILITY_CLUSTERING){
				topN = 1;
				applyThreshold = false;
			}
	
			//if null - reset applyThreshold to true
			if (JSUtil.nil(applyThreshold)) {
				applyThreshold = true;
			}
			//classification solution each class has different threshold
			//therefor needs to get all the results from ml engine
			if (applyThreshold && this.validSolutionCapability(solution)===this.CAPABILITY_CLASSIFICATION) {
				var maxClassificationTopN = (topN * MLBaseConstants.CLASSIFICATION_TOP_N_MULTIPLIER).toFixed();
				outcomeArr = solution.predictTopN(gr, maxClassificationTopN);
			}
			else  { 
				outcomeArr = solution.predictTopN(gr, topN); 
			}

			if (outcomeArr === null) {
				//instead of returning null returning empty array
				return [];
			}

			//applying threshold if set to true
			if(applyThreshold) {
				//keeping elements greater than threshold
				for (var index = outcomeArr.length - 1; index >= 0; --index) {
					var outcome = outcomeArr[index];
					var threshold = this.__getPredictionThreshold(solution, outcome);			
					// remove the element if less than threshold
					if (outcome.confidence() < threshold) {
						outcomeArr.splice(index, 1);
					}  else if(this.validSolutionCapability(solution)!==this.CAPABILITY_CLASSIFICATION){
						//the rest of the elements have greater threshold
						break;
					}
				}

				//get subset upto topN
				if(outcomeArr.length > topN) {
					outcomeArr = outcomeArr.slice(0,topN);
				}
			}

			sn_ml.SolutionStats.recordPredictValuesTopN(outcomeArr, solution);
			
		}catch(e){
			gs.logError("Exception caught: "+e, 'MLPredictor');
		}
		
		
		return outcomeArr;
	},
	
	/**
	 * Record final values to prediction results to specified record gr with optionally specified reason
	 */
	recordFinalValuesInPredictionResults: function(gr, reason) {
		sn_ml.SolutionStats.updateFinalValues(gr, reason);
	},
	
	/**
	 * Returns null if the capability field is empty, otherwise returns the capability of the solution
	 */
	validSolutionCapability: function(solution){
		var capability = solution.getCapability();
		if(!JSUtil.notNil(capability))
			return null;
		return capability;
	},
	
	
	// PRIVATE

	__applyPredictedValue: function(gr, solution, predictedValue, predictedValueSysId) {
		if (predictedValue === null)
			return false;
		
		var field = solution.getPredictedField();
		if (field === null)
			return false;

		var ge = gr.getElement(field);
		if (ge === null)
			return false;

		if (ge.getED().isReference()) {
			if (gs.nil(predictedValueSysId)) // Maintain backwards compatibility
				ge.setDisplayValue(predictedValue);
			else
				ge.setValue(predictedValueSysId);
		} else
			ge.setValue(predictedValue);
		return true;
	},
	
	__getPredictionThreshold: function(solution, outcome) {
		if (this.validSolutionCapability(solution)===this.CAPABILITY_CLASSIFICATION) {
			return solution.getThreshold(outcome.predictedValue());
		} else if (this.validSolutionCapability(solution)===this.CAPABILITY_SIMILARITY) {
			return solution.getThreshold();
		}
		return -1;
	}
	
};
```
---
title: "CopySolutionStatistics"
id: "copysolutionstatistics"
---

API Name: global.CopySolutionStatistics

```js
var CopySolutionStatistics = Class.create();
CopySolutionStatistics.prototype = {
	
	PRECISION: 'precision',
	COVERAGE: 'coverage',
	THRESHOLD: 'threshold',
	RECALL: 'recall',
	ML_SOLUTION: 'ml_solution',
	ML_CLASS: 'ml_class',
	ML_PC_LOOKUP: 'ml_pc_lookup',
	
	initialize: function() {
		this.statisticField = this.PRECISION;
		this.log = new GSLog('com.snc.ml.copy.solution.statistics.log', 'CopySolutionStatistics');
		this.log.disableDatabaseLogs();
	},
	
	
	
	copyStatistics: function(/*ml_class GlideRecord*/ current){
		
		try{
			var applyPcLookup = new ApplyPcLookup();
			this.currentMLClassRecord = current;
			
			if(JSUtil.nil(current) || !(current.isValidRecord())){
				this.log.logErr('Invalid record passed. A valid ml_class record is required');
				return;
			}
			
			this.previousSolutionRecord = this.getPreviousActiveSolution();
			
			
			//check if corresponding ml_class record exists in the previous solution 
			//and if user has modified precision/coverage values
			if(!this.isCopyRequired()){
				this.log.logErr('Skipping for class:'+this.currentMLClassRecord.name,'CopySolutionStatistics');
				applyPcLookup.updatePrecCovForSolution(current.solution);
				return;
			}
			
			var previousSolutionStatisticValue = this.getPreviousSolutionStatisticValue();
			
			
			var nearestPCLookupRecord = this.getNearestRecord(previousSolutionStatisticValue);
			
			current.setValue('pc_lookup', nearestPCLookupRecord);
			
			current.update();
						
			applyPcLookup.updatePrecCovForSolution(current.solution);
			
		} catch(e){
			this.log.logErr('Exception caught: '+e,'CopySolutionStatistics');
		}
		
	},
	
	
	
	setStatisticReferenceField: function(statisticField){
		this.statisticField = statisticField;
	},
	
	/**
	* getPreviousActiveSolution() method queries ML_SOLUTION table and returns last active solution
	*/
	
	getPreviousActiveSolution: function(){
		
		var solutionRecord = new GlideRecord(this.ML_SOLUTION);
		solutionRecord.addQuery('active', 'false');
		solutionRecord.addQuery('ml_capability_definition', this.currentMLClassRecord.solution.ml_capability_definition.sys_id);
		solutionRecord.orderByDesc('sys_updated_on');
		solutionRecord.setLimit(1);
		solutionRecord.query();
		if(solutionRecord.next()){
			return solutionRecord;
		}
		
	},
	
	
	/**
	* getPreviousSolutionStatisticValue() method queries ml_class record of current class label 
	* in the previous active solution and if it exists, returns the solution statistic value (eg. precision) of that record
	* input: previousSolutionRecord - sys_id of previous active solution record
	* output: solution statistic value (integer)
	*/
	
	getPreviousSolutionStatisticValue: function(){
		
		var previousSolutionStatisticValue = '';
		
		var mlClassRecord = new GlideRecord(this.ML_CLASS);
		mlClassRecord.addQuery('solution', this.previousSolutionRecord.sys_id);
		mlClassRecord.addQuery('name', this.currentMLClassRecord.name);
		mlClassRecord.query();
		while(mlClassRecord.next() && mlClassRecord.getValue('pc_lookup')){
			if(this.statisticField == this.PRECISION){
				previousSolutionStatisticValue = mlClassRecord.pc_lookup.precision;
			}else if(this.statisticField == this.COVERAGE){
				previousSolutionStatisticValue = mlClassRecord.pc_lookup.coverage;
			}else if(this.statisticField == this.RECALL){
				previousSolutionStatisticValue = mlClassRecord.pc_lookup.recall;
			}else{
				previousSolutionStatisticValue = mlClassRecord.pc_lookup.threshold;
			}
		}
		
		return previousSolutionStatisticValue;
	},
	
	/**
	*  getNearestRecord() method returns ml_pc_lookup record with closest match in precision
	*  inputs: classLabel - class label of the current ml_class record
	*          previousSolutionStatisticValue - precision value of ml_class record set by customer in the previous solution
	*  output: sys_id of ml_pc_lookup record with closest match in precision
	*  
	*  
	*/
	
	getNearestRecord: function(previousSolutionStatisticValue){
		
		var nearestRecordSysId = '';
		
		var pcLookupRecord = new GlideRecord(this.ML_PC_LOOKUP);
		pcLookupRecord.addQuery('class_name.name',this.currentMLClassRecord.name);
		pcLookupRecord.addQuery('solution', this.currentMLClassRecord.solution.sys_id);
		pcLookupRecord.orderBy(this.statisticField);
		pcLookupRecord.query();
		var min = 9999;
		while(pcLookupRecord.next()){
			var currentValue = pcLookupRecord.getValue(this.statisticField);
			var diff = Math.abs(pcLookupRecord.getValue(this.statisticField) - previousSolutionStatisticValue);
			if(diff<=min){
				// special case for precision == 100, this means that the class will become inactive
				// we do not want to make the class inactive if it was active in the previous solution version
				if(this.statisticField == this.PRECISION && currentValue == 100 && previousSolutionStatisticValue != 100) {
					continue;
				}
				min = diff;
				nearestRecordSysId = String(pcLookupRecord.getUniqueValue());
			}
		}
		return nearestRecordSysId;
		
	},
	
	/**
	* isCopyRequired() method checks
	*  1. if ml_class record of same class label exists in previous active solution record
	*  2. if customer has modified precision coverage values (if sys_mod_count >= 2)
	*  
	*  
	*/
	
	isCopyRequired: function(){
		
		var mlClassRecord = new GlideRecord(this.ML_CLASS);
		mlClassRecord.addQuery('solution', this.previousSolutionRecord.sys_id);
		mlClassRecord.addQuery('name', this.currentMLClassRecord.name);
		mlClassRecord.addQuery('sys_mod_count','>', 1);
		mlClassRecord.query();
		return (mlClassRecord.getRowCount() > 0);	
	},
    type: 'CopySolutionStatistics'
};
```
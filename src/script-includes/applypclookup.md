---
title: "ApplyPcLookup"
id: "applypclookup"
---

API Name: global.ApplyPcLookup

```js
var ApplyPcLookup = Class.create();
ApplyPcLookup.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	// DO NOT MODIFY THIS SCRIPT INCLUDE NAME
	// THIS SCRIPT INCLUDE IS BEING INVOKED FROM JAVA CLASS - CLASSIFICATIONSOLUTIONVERSION
	CLASSIFICATION:'classification_trainer',
	SIMILARITY:'similarity_trainer',
	
	applyPcLookup: function() {		
		try{
			
			this.log = new GSLog('com.snc.ml.apply.pc.lookup', 'ApplyPcLookup');
			this.log.disableDatabaseLogs();
			
			var pcLookupRec = this.__getPcLookupRec(this.getParameter('sysparm_sysId'));
			if(pcLookupRec == null)
				return;
			
			if (!JSUtil.nil(pcLookupRec.solution.capability)) {
				this.solution_type = pcLookupRec.solution.capability;
			} else if (!JSUtil.nil(pcLookupRec.solution.ml_capability_definition)) {
				this.solution_type = pcLookupRec.solution.ml_capability_definition.capability.value;
			}
			
			if(this.solution_type==this.CLASSIFICATION){
				this.__updatePcLookupRefInClass(pcLookupRec);
				this.updatePrecCovForSolution(pcLookupRec.solution);
			} else if(this.solution_type==this.SIMILARITY){
				this.__updateThresholdCoverageForSolution(pcLookupRec.threshold, pcLookupRec.coverage, pcLookupRec.solution);
			}
			
		} catch(e){
			this.log.logErr('Exception caught in ApplyPcLookup: '+e, 'ApplyPcLookup');
		}
		
        return;
    },
    		
	// DO NOT MODIFY THIS METHOD SIGNATURE
	// THIS METHOD IS BEING INVOKED FROM JAVA CLASS - CLASSIFICATIONSOLUTIONVERSION
	updatePrecCovForSolution: function(solutionSysId) {
		var sol = this.__calcPrecCovForSolution(solutionSysId);		
		this.__updatePrecCovForSolution(sol.precision, sol.coverage, sol.recall, solutionSysId);
	},
	
	__getPcLookupRec: function(sysId) {
		var record = new GlideRecord("ml_pc_lookup");
		record.addQuery("sys_id", sysId);
		record.query();
		if (record.next())
			return record;
		else
			return null;
	},
	
	__updatePcLookupRefInClass: function(pcLookupRec) {
		var record = new GlideRecord("ml_class");		
		record.addQuery("sys_id", pcLookupRec.class_name);
		record.query();	
		if (record.next()) {
			record.pc_lookup = pcLookupRec.sys_id;
			record.update();
		}
	},
	
	__calcPrecCovForSolution: function(solutionSysId) {
		var sol_prec = 0.0; 
		var sol_cov = 0.0; 
		var sol_rec = 0.0;
		var tot_dist = 0.0;
		var record = new GlideRecord("ml_class");
		record.addQuery("solution", solutionSysId);
		record.query();
		while (record.next()) {
			sol_prec += record.distribution * record.pc_lookup.precision;
			sol_cov += record.distribution * record.pc_lookup.coverage;
			sol_rec += record.distribution * record.pc_lookup.recall;
			tot_dist += record.distribution;
		}
		sol_prec = tot_dist != 0 ? sol_prec / tot_dist : 0;
		sol_rec = tot_dist != 0 ? sol_rec / tot_dist : 0;
		sol_cov = sol_cov / 100;
		var sol = {};
		sol.precision = sol_prec;
		sol.coverage = sol_cov;
		sol.recall = sol_rec;
		return sol;
	},
	
	__calcThresholdCoverageForSolution: function(solutionSysId){
		return Math.floor((Math.random() * 100) + 1);
	},
	
	__updatePrecCovForSolution: function(sol_prec, sol_cov, sol_rec, solutionSysId) {
		var record = new GlideRecord("ml_solution");
		record.addQuery("sys_id", solutionSysId);
		record.query();	
		if (record.next()) {
			record.solution_precision = sol_prec;
			record.solution_coverage = sol_cov;
			record.solution_recall = sol_rec;
			record.update();
		}
	},
	
	__updateThresholdCoverageForSolution: function(solution_threshold, solution_coverage, solutionSysId){
		var record = new GlideRecord("ml_solution");
		record.addQuery("sys_id", solutionSysId);
		record.query();	
		if (record.next()) {
			record.threshold = solution_threshold;
			record.solution_coverage = solution_coverage;
			record.update();
		}
	},
	
	getCombinationsCloserToUserTarget: function(pcLookuptable, input, usePercentage) {
		
		var inputs = Object.keys(input);
		
		var allclasses = Object.keys(pcLookuptable);
		var classes = Object.keys(pcLookuptable);

		var nearestRecord = {};
		
		//If solution level targets are specified, iterate k times and choose a random class level value(if class target is not specified), else choose the nearest to the class target.
		if("solution" in input) {
			var metric = Object.keys(input.solution)[0];
			var inputTarget = parseFloat(input.solution[metric]);
			var randomList = [];
			
			var min = 9999;
			
			var minorityClass = {};
			// For classess with distribution < 1%, compute the nearest.
			for(var i in allclasses) {
				var className = allclasses[i];
				if(inputs.indexOf(className) < 0 && "solution" in input) {
					var pclookups = pcLookuptable[className];
					if(parseFloat(pclookups[0]["distribution"]) < 0.5) {
						minorityClass[className] = this.findNearest(className, pcLookuptable, metric, inputTarget, usePercentage);
					}
				}
				if(inputs.indexOf(className)>=0) {
					var classMetric = Object.keys(input[className])[0];
					var classTarget = parseFloat(input[className][classMetric]);
					minorityClass[className] = this.findNearest(className, pcLookuptable, classMetric, classTarget, usePercentage);
				}	
				
			}
			
			classes = this.difference(allclasses, Object.keys(minorityClass));
			
			var solEstimate1 = 0.0;
			var totalDistr1 = 0.0;
			for(var cn in minorityClass) {
				if(minorityClass[cn] !== null) {
					solEstimate1 = solEstimate1 + parseFloat(minorityClass[cn][metric]) * parseFloat(minorityClass[cn]["distribution"]);
					totalDistr1 = totalDistr1 + parseFloat(minorityClass[cn]["distribution"]);
				}
				
			}

			for(var key in minorityClass)
			{
				nearestRecord[key] = minorityClass[key];
			}
			
			
			var iterations = 1000;
			for(var k=1; k <= iterations; k++) {
				
				var classRandom = {};
				for(var j in classes) {
					var clasname = classes[j];
					
					//Choose the nearest to the solution target at the class level in the last iteration so that we don't rule out these estimates as 
					//the estimates from the random approach may be better or worse than the default approach.
					if(k==iterations) {
						gs.info("Last iteration -- finding the nearest ones");
						var near = this.findNearest(clasname, pcLookuptable, metric, inputTarget, usePercentage);
						classRandom[clasname] = near;
					}else {
						classRandom[clasname] = this.randomPerClass(pcLookuptable[clasname]);
					}
				}
				
				//For each random selection, check if it is closer to solution target.
				var solEstimate = 0.0;
				var totalDistr = 0.0;
				
				for(var l in classes) {
					var classname = classes[l];
					if(classRandom[classname] !== null) {
						solEstimate = solEstimate + parseFloat(classRandom[classname][metric]) * parseFloat(classRandom[classname]["distribution"]);
						totalDistr = totalDistr + parseFloat(classRandom[classname]["distribution"]);
					}
				}
				
				solEstimate = (solEstimate + solEstimate1)/(totalDistr+ totalDistr1);
				
				if(k==iterations) {
					gs.info("iteration = " + k + " Final Sol Estimate = " + solEstimate + " Total Distribution = " + (totalDistr+totalDistr1));
				}
				
				if(usePercentage) {
					solEstimate = solEstimate * 100;
				}
				
				var diff = Math.abs(solEstimate - inputTarget);
				if(diff < min) {
					min = diff;
					for(var ke in classRandom)
					{
						nearestRecord[ke] = classRandom[ke];
					}
				}
				randomList.add(classRandom);
			}
			
			var solEstimate2 = 0.0;
			var totalDistr2 = 0.0;
			for(var cname in nearestRecord) {
				if(nearestRecord[cname] != null) {
				solEstimate2 = solEstimate2 + parseFloat(nearestRecord[cname][metric]) * parseFloat(nearestRecord[cname]["distribution"]);
				totalDistr2 = totalDistr2 + parseFloat(nearestRecord[cname]["distribution"]);
				}
			}
			gs.info("Final Estimate: " + (solEstimate2/totalDistr2));
		}
		//If only class level targets are specified, choose nearest value to the target for each class.
		else {
			for(var cln in input) {
				var clMetric = Object.keys(input[cln])[0];
				var near = this.findNearest(cln, pcLookuptable, clMetric, parseFloat(input[cln][clMetric]), usePercentage);
				nearestRecord[cln] =  near;
			}
		}
		
		return nearestRecord;
	},
	
	difference: function(a1, a2) {
		var result = [];
		for (var i = 0; i < a1.length; i++) {
			if (a2.indexOf(a1[i]) < 0) {
				result.push(a1[i]);
			}
		}
		
		return result;
	},
	
	randomPerClass: function(list) {
		var num = Math.random() * (list.length);
		var rnd = Math.floor(num);
	    return list[rnd];
	},
	
	findNearest: function(className, pcLookuptable, metric, value, usePercentage) {
		var pclookups = pcLookuptable[className];
		var min = 9999;
		var nearestRecord = null;
		for(var i in pclookups) {
			var pcLookup = pclookups[i];
			var currentValue = parseFloat(pcLookup[metric]);
			if(usePercentage) {
				currentValue = currentValue*100;
			}
			var diff = Math.abs(currentValue - value);
			if(diff < min) {
				if(metric == "precision" && currentValue == 100.0 && value != 100.0) {
					continue;
				}
				min = diff;
				nearestRecord = pcLookup;
			}
		}
		
		return nearestRecord;
	},
	
	updateSolution: function(pcLookRef){
		var pcLookupRec = this.__getPcLookupRec(pcLookRef);
		if(pcLookupRec == null)
			return;
		this.__updatePcLookupRefInClass(pcLookupRec);
		this.updatePrecCovForSolution(pcLookupRec.solution);
	},
	
	type: 'ApplyPcLookup'
});
```
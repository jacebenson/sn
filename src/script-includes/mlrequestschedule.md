---
title: "MLRequestSchedule"
id: "mlrequestschedule"
---

API Name: global.MLRequestSchedule

```js
var MLRequestSchedule = Class.create();
MLRequestSchedule.prototype = {
	initialize: function() {
		this.solutionDefReference = "ml_capability_definition";
	},
		deleteExistingCapabilityTrainingRequestSchedule: function(sysId) {
			this.deleteExistingTrainingRequestSchedule(sysId, {'solutionDefField':this.solutionDefReference});
		},
	
		deleteExistingTrainingRequestSchedule: function(sysId, options) {
			var solutionDefField = (options && options['solutionDefField']) || "solution_definition";
			var solution = new GlideRecord("ml_training_request_schedule");
			solution.addQuery(solutionDefField, sysId);
			solution.deleteMultiple();
		},
		
		deleteExistingUpdateRequestSchedule: function(sysId) {
			var solution = new GlideRecord("sysauto_script");
            solution.addQuery("name", sysId);
            solution.deleteMultiple();
        },
		
		insertCapabilityTrainingRequestSchedule: function(sysId, label, trainingFrequency){
			this.insertTrainingRequestSchedule(sysId, label, trainingFrequency, {'solutionDefField':this.solutionDefReference});
		},
	
		insertTrainingRequestSchedule: function(sysId, label, trainingFrequency, options) {
			var solutionDefField = (options && options['solutionDefField']) || "solution_definition";
			var skipFirstRun = (options && JSUtil.toBoolean(options['skipFirstRun'])) || false;
			var solution = new GlideRecord("ml_training_request_schedule");
			solution.initialize();
			solution.setValue("name", label);
			solution.setValue(solutionDefField, sysId);
			if (trainingFrequency === "run_once") {
				solution.setValue("run_type", "once");
			} else {
				var days = trainingFrequency.split('_')[1];
				var runPeriod = days + " 00:00:00";
				solution.setValue("run_type", "periodically");
				solution.setValue("run_period", runPeriod);
				if (skipFirstRun) {
					var nextRunTime = new GlideDateTime();
					nextRunTime.addDaysLocalTime(days);
					solution.setValue("run_start", nextRunTime);
				}
			}
			solution.insert();
		},
		
		insertRunonceUpdateRequestSchedule: function(sysId, name) {
            var solution = new GlideRecord("sysauto_script");
            solution.initialize();
            solution.setValue("name", sysId);
            solution.setValue("script","new global.MLUpdater().update(\""+name+"\");");
            solution.setValue("run_type", "once");
            solution.insert();
        },
	
		insertUpdateRequestSchedule: function(sysId, name, updateFrequency) {
            var solution = new GlideRecord("sysauto_script");
            solution.initialize();
            solution.setValue("name", sysId);
            solution.setValue("script","new global.MLUpdater().update(\""+name+"\");");
            solution.setValue("run_type", "periodically");
			solution.setValue("run_as", "88aad6c5c73003005f1b78d48b9763a5");
            var intervaltype = updateFrequency.split('_')[2];
			if (intervaltype === "update") {
				this.deleteExistingUpdateRequestSchedule(sysId);
			} else {
				if (intervaltype === "minute" || intervaltype === "minutes") {
					var minutes = "00:" + updateFrequency.split('_')[1] + ":00";
					solution.setValue("run_period", minutes);
				} else if (intervaltype === "hour" || intervaltype === "hours") {
					var hours = updateFrequency.split('_')[1] + ":00:00";
					solution.setValue("run_period", hours);
				} else if (intervaltype === "day" || intervaltype === "days") {
					var days = updateFrequency.split('_')[1] + " 00:00:00";
					solution.setValue("run_period", days);
				} 
				solution.insert();
			}
        },
		
		isCapabilitySolutionCurrentlyTraining: function(solutionDefinitionId) {
			return this.isSolutionCurrentlyTraining(solutionDefinitionId,{'solutionDefField':this.solutionDefReference});
		},
	
		isSolutionCurrentlyTraining: function(solutionDefintionId, options) {
			var solutionDefField = (options && options['solutionDefField']) || "solution_definition";
			var gr = new GlideRecord('ml_solution');
			gr.addQuery(solutionDefField, solutionDefintionId);
			gr.orderByDesc('sys_created_on');
			gr.query();
			if (gr.next() &&
			(gr.state == 'waiting_for_training' ||
			gr.state == 'training_request_received' ||
			gr.state == 'fetching_files_for_training' ||
			gr.state == 'training_solution' ||
			gr.state == 'preparing_data' ||
			gr.state == 'uploading_solution') &&
			gs.getProperty('glide.platform_ml.override_training_lock') == 'false') {
				in_training = true;
			}
			else
				in_training = false;
			
			return in_training;
		},
		
		type: 'MLRequestSchedule'
	};
```
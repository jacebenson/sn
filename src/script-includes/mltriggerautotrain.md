---
title: "MLTriggerAutoTrain"
id: "mltriggerautotrain"
---

API Name: global.MLTriggerAutoTrain

```js
var MLTriggerAutoTrain = Class.create();
MLTriggerAutoTrain.prototype = {

    initialize: function() {
		this.CLASSIFICATION_CAPABILITY = "95ca97b453873300d1dcddeeff7b120f";
		this.SIMILARITY_CAPABILITY = "15ab7f3c53873300d1dcddeeff7b12ce";
	},

    getSolutionRecords: function(solution_id) {
        var rowCount = {};
        var minClassificationRows = parseInt(gs.getProperty("glide.platform_ml.api.csv_min_line", 10000));
        var minSimilarityRows = parseInt(gs.getProperty("glide.platform_ml.api.min_similarity_window_records", 10));
        rowCount.actualRows = 0;
		rowCount.requiredRows = 1;
        try {
            var mlSolutionDef = new GlideRecord("ml_capability_definition_base");
            if (mlSolutionDef.get(solution_id)) {
                var filter = mlSolutionDef.getValue("filter");
                var gr = new GlideRecord(mlSolutionDef.getValue("table"));
				if (mlSolutionDef.getValue("capability") == this.CLASSIFICATION_CAPABILITY)
					rowCount.requiredRows = minClassificationRows;
				else if (mlSolutionDef.getValue("capability") == this.SIMILARITY_CAPABILITY)
					rowCount.requiredRows = minSimilarityRows;
                gr.addEncodedQuery(filter);
                gr.query();
                rowCount.actualRows = gr.getRowCount();
                return rowCount;
            }
        } catch (e) {
            gs.logError("Exception caught: " + e, 'MLTriggerAutoTrain');
        }
        return rowCount;
    },

    hasRequiredClassificationRows: function(solution_id) {
        var rowCount = this.getSolutionRecords(solution_id);
        //var maxRec = parseInt(gs.getProperty("glide.platform_ml.api.csv_max_line", 300000));
        //return (rowCount.actualRows >= rowCount.requiredRows) && (rowCount.actualRows <= maxRec);
        //DEF0096884
        return (rowCount.actualRows >= rowCount.requiredRows);
    },

    hasRequiredSimilarityRows: function(solution_id) {
		var rowCount = this.getSolutionRecords(solution_id);
        //var maxRec = parseInt(gs.getProperty("glide.platform_ml.api.max_similarity_window_records", 100000));
		//return (rowCount.actualRows >= rowCount.requiredRows) && (rowCount.actualRows <= maxRec);
		//DEF0096884
		return (rowCount.actualRows >= rowCount.requiredRows);
    },

    triggerTrainingRequests: function(capability) {
        var solutionDefs = new MLSolutionDefinitionUtils().getDefaultOOBSolutionDefinitions(capability);
        return this.triggerTrainings(Object.keys(solutionDefs));
    },

    triggerPluginTrainings: function(pluginId) {
        var existingSolutions = new GlideRecord('ml_solution');
        existingSolutions.addActiveQuery();
        existingSolutions.query();
        if (existingSolutions.next()) {
            gs.info("Skipping auto-training because at least one trained solution exists");
            return;
        }

        //Get all OOB sys ids based on plugin id
        var solutionDefs = [];
        var gr = new GlideRecord("ml_autotrain_solution");
        if (pluginId)
            gr.addQuery("plugin_id", pluginId);
		else
			return;
        gr.addQuery("solution_definition.capability", [this.CLASSIFICATION_CAPABILITY, this.SIMILARITY_CAPABILITY]);
        gr.query();
        while (gr.next())
            solutionDefs.push(gr.getValue("solution_definition"));
		solutionDefs = new ArrayUtil().unique(solutionDefs);
		
        var trainingSolutions =  this.triggerTrainings(solutionDefs);
        trainingSolutions["plugin_id"] = pluginId;
		new MLAnalytics().trackAutoTraining(trainingSolutions);
		gs.info("Sending data for analytics");
    },

    //New function for common logic used by landing page and sys_trigger auto-training
    triggerTrainings: function(solutionDefs) {
        var trainingSolutions = {};
        var defintionRecords = new GlideRecord('ml_capability_definition_base');
        defintionRecords.addQuery("sys_id", solutionDefs);
        defintionRecords.addQuery("current_solution_version", "");
        defintionRecords.query();

        while (defintionRecords.next()) {
            var key = defintionRecords.getValue("sys_id");
            var solutionLabel = defintionRecords.getValue("solution_label");
            //If the solution definition has less number of rows than the required rows for training, don't send a training request
            if ((defintionRecords.capability == this.CLASSIFICATION_CAPABILITY && !this.hasRequiredClassificationRows(key)) || (defintionRecords.capability == this.SIMILARITY_CAPABILITY && !this.hasRequiredSimilarityRows(key))) {
                gs.info("Solution definition " + key + " has less number of records for training.");
                continue;
            }

            //Triggering only once as this is an Auto Train
            gs.info("Preparing to add a job request for default solution " + solutionLabel);
            new sn_ml.TrainingRequest().submitForTraining(key);
            trainingSolutions[key] = solutionLabel;
        }

		
        return trainingSolutions;
    },

    createDelayedTrigger: function(jobRecord, sysSecondTriggerName, delay) {
        var nextAction = gs.minutesAgo(delay);
        jobRecord.name = sysSecondTriggerName;
        jobRecord.state = 0;
        jobRecord.next_action.setValue(nextAction);
        jobRecord.setValue('upgrade_safe','false');
        jobRecord.claimed_by = null;
        jobRecord.insert();
    },

    type: 'MLTriggerAutoTrain'

};
```
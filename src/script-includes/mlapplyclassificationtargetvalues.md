---
title: "MLApplyClassificationTargetValues"
id: "mlapplyclassificationtargetvalues"
---

API Name: sn_ml_ui.MLApplyClassificationTargetValues

```js
var MLApplyClassificationTargetValues = Class.create();
MLApplyClassificationTargetValues.prototype = {
    initialize: function() {},
	// DO NOT MODIFY THIS SCRIPT INCLUDE NAME, FOLLOWING METHOD NAME AND PARAMETERS
	// THIS METHOD IS BEING INVOKED FROM JAVA CLASS - CLASSIFICATIONSOLUTIONVERSION
    applyClassificationTargetValues: function(solutionId, targetMetric, targetMetricValue) {

        var applyPcLookup = new global.ApplyPcLookupInstantiator().getApplyPcLookup();

        var userTargets = this._getMetricInStringFormat(targetMetric, targetMetricValue);
        gs.info(gs.getMessage('Target Metric Values {0}', userTargets));

        //PC lookup info along with distribution per class
        var pc = {};
        gs.info(gs.getMessage('Solution id: {0}', solutionId));
        //Get the class distribution

        var mlClass = new GlideRecordSecure("ml_class");
        mlClass.addQuery("solution", solutionId);
        mlClass.query();
        var classDistr = {};
        while (mlClass.next()) {
            var className = mlClass.getValue("name");
            gs.info(gs.getMessage('Class: {0}', className));
            var classid = mlClass.getValue("sys_id");
            var distribution = mlClass.getValue("distribution");
            classDistr[classid] = {
                "className": className,
                "distribution": distribution
            };
        }
        gs.info(classDistr);

        //Get all pc lookups per class
        var pcl = new GlideRecordSecure("ml_pc_lookup");
        pcl.addQuery("solution", solutionId);
        pcl.query();
        while (pcl.next()) {
            var classSys_id = pcl.getValue("class_name");
            var coverage = pcl.getValue("coverage");
            var precision = pcl.getValue("precision");
            var recall = pcl.getValue("recall");
            var threshold = pcl.getValue("threshold");

            var pcl_rec = {
                "precision": precision,
                "coverage": coverage,
                "recall": recall,
                "threshold": threshold,
                "distribution": classDistr[classSys_id].distribution,
                "sys_id": classSys_id,
                "pcl_ref": pcl.getValue("sys_id")
            };
            if (classDistr[classSys_id].className in pc) {
                var pcl_val = pc[classDistr[classSys_id].className];
                pcl_val.push(pcl_rec);
                pc[classDistr[classSys_id].className] = pcl_val;
            } else {
                var pcl_val_new = [];
                pcl_val_new.push(pcl_rec);
                pc[classDistr[classSys_id].className] = pcl_val_new;
            }
        }

        //Find the closest combination per class according to user given targets
        var estimates = applyPcLookup.getCombinationsCloserToUserTarget(pc, JSON.parse(userTargets), false);
        gs.info(JSON.stringify(estimates));

        gs.info(gs.getMessage("Updating solution estimates based on user targets"));
        for (var class_name in estimates) {
            if (estimates[class_name] !== null) {
                applyPcLookup.updateSolution(estimates[class_name].pcl_ref);
            } else {
                gs.info(gs.getMessage('No default combination found for class {0}', class_name));
            }
        }


    },
    _getMetricInStringFormat: function(metricName, metricValue) {

        var metric = {};
        metric.solution = {};
        metric.solution[metricName] = metricValue;
        return global.JSON.stringify(metric);

    },

    validateInputs: function(targetMetricName, targetMetricValue) {
        var errorMessage = '';
        if (!(targetMetricName === 'precision' || targetMetricName === 'coverage' || targetMetricName === 'recall'))
            errorMessage = 'Invalid Metric Name : ' + targetMetricName;
        if (isNaN(targetMetricValue))
            errorMessage = targetMetricName[0].toUpperCase() + targetMetricName.slice(1) + 'should be valid number';

        if (targetMetricValue < 0 || targetMetricValue > 100)
            errorMessage = targetMetricName[0].toUpperCase() + targetMetricName.slice(1) + 'should be between 0 and 100';

        if (errorMessage !== '') {
            gs.info(gs.getMessage('Solution Update Failed . Error: {0}', errorMessage));
            throw (errorMessage);
        }

    },
    //Checks whether class recall is specified for a solution pre-training
    isClassRecallSpecified: function(solutionId) {
        var classRecallSpecified = {};
        classRecallSpecified.solution_id = solutionId;
        classRecallSpecified.classRecallSpecified = 'false';
        var gr = new GlideRecordSecure('ml_solution');
        gr.get(solutionId);

        if (!gs.nil(gr)) {
            var parametersElement = gr.getValue('advanced_solution_params');
            if (!gs.nil(parametersElement) && parametersElement !== '') {
                var parameters = parametersElement.split(';');
                for (var i = 0; i < parameters.length; i++) {
                    var parameter = parameters[i];
                    if (parameter.indexOf('Class-Recall') !== -1) {
                        var classRecallElement = parameter.split('=');
                        if (classRecallElement.length === 2) {
                            var classNameRecallValue = classRecallElement[1].split(':');
                            if (classNameRecallValue.length === 2) {
                                classRecallSpecified.classRecallSpecified = 'true';
                                break;
                            }
                        }

                    }
                }

            }
        }

        return classRecallSpecified;
    },

    type: 'MLApplyClassificationTargetValues'
};
```
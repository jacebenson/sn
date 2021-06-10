---
title: "MLGroupbyUtils"
id: "mlgroupbyutils"
---

API Name: global.MLGroupbyUtils

```js
var MLGroupbyUtils = Class.create();
MLGroupbyUtils.prototype = {
    initialize: function() {
    },
	
	isGroupBy: function(current){
		return this.isParentGroupbySolutionValid(current) || this.isChildGroupbySolutionValid(current);	
	},
	
	trainGroupbySolution: function(parentSol, currNum) {
		var groupby = this.isParentGroupbySolutionValid(parentSol);
		if(!groupby){
			gs.info('not a groupby sol');
			return false;
		}
		if(new MLTriggerAutoTrain().hasRequiredClassificationRows(parentSol.getUniqueValue())){
			new MLSolutionDefinitionUtils().trainCapabilitySolDef(parentSol);
			return true;
		}
		return false;
	},
	
	isParentGroupbySolutionValid: function(parentSol) {
		if (!parentSol.getValue("sys_class_name").includes('groupby') && new MLPredictor().findActiveSolution(parentSol.getUniqueValue()) == null)
			return parentSol.getValue("groupby_field");
	},
	
	isChildGroupbySolutionValid: function(parentSol) {
		if (parentSol.getValue("sys_class_name").includes('groupby'))
			return parentSol.getValue("groupby_value");
	},
	
	isChildGroupbySol: function(sol) {
		var childGR = this.getGlideRecord(sol.getValue("ml_capability_definition"));
		return this.isChildGroupbySolutionValid(childGR);
	},
	
	isGroupbySolutionTraining: function(solName, groupby) {
		var sol = this.getGlideRecord(solName);
		var finalStates = ['solution_cancelled', 'solution_error', 'solution_complete', 'retry', 'timed_out', 'unauthorized'];
		if (this.isParentGroupbySolutionValid(sol)) {
			var parentSolution = new GlideRecord('ml_solution');
			parentSolution.addQuery('ml_capability_definition', sol.getUniqueValue());
			parentSolution.orderByDesc("sys_created_on");
			parentSolution.setLimit(1);
			parentSolution.query();
			if (parentSolution.next() && !(finalStates.indexOf(parentSolution.getValue("state")) > -1))
				return parentSolution.sys_id;
		}
	},
	
	cancelGroupbyTraining: function(solName, groupby) {
		var solId = this.isGroupbySolutionTraining(solName, groupby);
		if (solId) {
			new sn_ml.TrainingRequest().cancelTraining(solId);
		}
		return solId;
	},
	
	getChildSolutions: function(parentSol){
		var childSolutionList = [];
		var groupby = this.isParentGroupbySolutionValid(parentSol);
		if(!groupby){
			gs.info('not a groupby sol');
			return childSolutionList;
		}
		var groupbySol = new GlideRecord(parentSol.sys_class_name + "_groupby");
		groupbySol.addQuery("solution_definition", parentSol.getUniqueValue());
		groupbySol.addQuery("current_solution_version", parentSol.getValue('current_solution_version') == 1 ? null : parentSol.getValue('current_solution_version') - 1);
		groupbySol.addQuery("groupby_field", groupby);
		groupbySol.query();
		while (groupbySol.next()) {
			var val = new MlValidationHelper().minmaxValidation(groupbySol.table,
			groupbySol.filter, groupbySol.capability.getRefRecord().getValue("value"));
			if (val.validation)
			childSolutionList.push(groupbySol.getUniqueValue());
		}
		return childSolutionList;
	},
	
	getGlideRecord: function(identifier){
		var baseSol = new GlideRecord("ml_capability_definition_base");
		if(baseSol.get('solution_name', identifier) || baseSol.get(identifier) || baseSol.get('solution_label', identifier)) {
			var sol = new GlideRecord(baseSol.sys_class_name);
			sol.get(baseSol.getUniqueValue());
			return sol;
		}
	},
	
	getChildSolutionGRForPrediction: function(parentDef, groupby, groupbyList){
		var solutionSysId = "";
		var groupbySol = new GlideRecord(parentDef.sys_class_name + "_groupby");
		var isExisting = groupbySol.get("solution_label", parentDef.solution_label + ' ' + groupby);
		if(isExisting) {
			solutionSysId = groupbySol;
		} else {
			var childDefinitions = new GlideRecord(parentDef.sys_class_name + "_groupby");
			childDefinitions.addQuery('solution_definition', parentDef.getUniqueValue());
			childDefinitions.query();
			while(solutionSysId === "" && childDefinitions.next()) {
				groupbyList.push(childDefinitions.getValue('groupby_value'));
				if(childDefinitions.getValue('groupby_value').toLowerCase() == groupby.trim().toLowerCase()){
					solutionSysId = childDefinitions;
				}
			}
		}
		if (solutionSysId != "")
			return this.getGlideRecord(solutionSysId.getUniqueValue());
		return solutionSysId;
	},
	
	getValidActiveVersion: function(parentDef, version){
		var activeVersion;
		var activeSolution = new GlideRecord("ml_solution");
		activeSolution.addQuery("ml_capability_definition", parentDef.getUniqueValue());
		activeSolution.addQuery("state", "solution_complete");
		if (version)
			activeSolution.addQuery("version", version);
		activeSolution.orderByDesc("sys_created_on");
		activeSolution.query();
		if (activeSolution.next()){
			activeVersion = activeSolution.getValue("version");
		}
		return activeVersion;
	},
	
	doGroupbyTrainingValidation: function(solDefGr, groupby) {
		var capability = solDefGr.getDisplayValue('capability').toLowerCase();
		var validation = {};
		validation.valid = true;
		validation.reason = "";
		if ((capability != 'classification' && capability != 'regression') || solDefGr.getValue('sys_class_name').includes('groupby')) {
			gs.warn('Groupby support is only available for classification and regression solutions ');
			validation.valid = false;
			validation.reason = "Group-by support is only available for classification and regression solutions";
		} else {
			solDefGr.setValue("active",true);
		}

		if (new MLPredictor().findActiveSolution(solDefGr.solution_name)) {
			gs.warn('Pre-trained solution already exists for ' + solDefGr.solution_name);
			validation.valid = false;
			validation.reason = "Please provide untrained solution definition";
			return validation;
		}

		var grFields = new GlideRecord(solDefGr.table);
		grFields.initialize();
		var fields = grFields.getFields();
		for (var num = 0; num < fields.size(); num++) {
			var ed = fields.get(num).getED();
			if(ed.getLabel().toLowerCase() == groupby.toLowerCase()){
				groupby = ed.toString();
			}
		}

		var ValidGroupby = this._isValidGroupby(new GetOutputFieldTypes().process(solDefGr.table), groupby.toString());
		if (!ValidGroupby) {
			gs.warn('Invalid group-by field ' + groupby);
			validation.valid = false;
			validation.reason = "Please provide valid group-by field";
			return validation;
		}
		solDefGr.setValue("groupby_field",groupby);
		if (groupby == solDefGr.output_field) {
			gs.warn('Output field and Group-by field cannot have the same value ' + groupby);
			validation.valid = false;
			validation.reason = "Output field and Group-by field cannot have the same value";
			return validation;
		}

		if (solDefGr.getValue('fields').split(',').indexOf(groupby) != -1) {
			gs.warn('Input field and Group-by field cannot have common value ' + groupby);
			validation.valid = false;
			validation.reason = "Input field and Group-by field cannot have common value";
			return validation;
		}
		if (validation.valid)
			solDefGr.update();
		return validation;
	},
	
	_isValidGroupby: function(arry, groupby) {
		var outputList = false;
		for (var index = 0; index < arry.length; index++) {
			outputList |= arry[index].getName() == groupby;
		}
		return outputList;
	},
	
	createAndTrainGroupbySolutions: function(solDefGr, groupby){
		var response = {};
		response.valid = true;
		response.reason = "";
		var minClassificationRows = parseInt(gs.getProperty("glide.platform_ml.api.csv_min_line", 10000));
		var groupbyColNames = [];
		var groupbyColDisplayNames = [];
		var gr = new GlideAggregate(solDefGr.table);
		gr.addEncodedQuery(solDefGr.filter);
		gr.addHaving('COUNT', '>', minClassificationRows);
		gr.groupBy(groupby);
		gr.query();
		var isGroupbyRef = gr.getElement(groupby).getED().isReference();
		while (gr.next()) {
			gr.getValue(groupby).length > 0 ? groupbyColNames.push(gr.getValue(groupby)) : null;
			if (isGroupbyRef || gr.getDisplayValue(groupby)){
				gr.getDisplayValue(groupby).length > 0 ? groupbyColDisplayNames.push(gr.getDisplayValue(groupby)) : null;
			}
		}

		var sortedgroupbyNames = JSON.parse(JSON.stringify(isGroupbyRef ? groupbyColDisplayNames : groupbyColNames));
		var maxGroupbySolutionNameLength = sortedgroupbyNames.sort(function(a, b) {  return b.length - a.length;  })[0].length + solDefGr.getValue('solution_name').length;
		if (maxGroupbySolutionNameLength > solDefGr.solution_name.getED().getLength()) {
			response.valid = false;
			response.reason = "Please provide a shorter version of solution name";
			return response;
		}
		var totalSol = this._insertGroupbyDefinition(solDefGr, groupbyColDisplayNames, groupbyColNames, groupby);
		if (totalSol == 0) {
			gs.warn('Unable to insert child group-by solution definition ');
			response.valid = false;
			response.reason = "Unable to train any solution as they failed in basic validations";
			return response;
		}

		if(!(this.trainGroupbySolution(solDefGr))){
			gs.warn('Solution type is not classification or it is not a group-by solution');
			response.valid = false;
			response.reason = "Unable to train solution.";
			return response;
		}
		response.reason = totalSol;
		return response;
	},
	
	_insertGroupbyDefinition: function(solDef, displayColNames, colNames, groupby) {
		var count = 0;
		for (var index = 0; index < colNames.length; index++) {
			var groupbyValue = displayColNames.length > 0 ? displayColNames[index] : colNames[index];
			var groupbySol = new GlideRecord(solDef.sys_class_name + "_groupby");
			var isExisting = groupbySol.get("solution_label", solDef.solution_label + ' ' + groupbyValue);
			var newFilter = this._getNewFilter(solDef, groupby, colNames[index]);
			this._copyFields(solDef, groupbySol);
			groupbySol.setValue("solution_definition", solDef.getUniqueValue());
			groupbySol.setValue("solution_label", solDef.solution_label + ' ' + groupbyValue);
			groupbySol.setValue("filter", newFilter);
			groupbySol.setValue("groupby_value", groupbyValue);
			groupbySol.setValue("training_frequency", "run_once");
			var val = new MlValidationHelper().minmaxValidation(groupbySol.table,
				groupbySol.filter, groupbySol.capability.getRefRecord().getValue("value"));
			if (!val.validation)
				gs.info(groupbySol.solution_label + ' does not have enough records');
			if (isExisting) {
				var solId = groupbySol.getUniqueValue();
				groupbySol.update();
			} else {
				solId = groupbySol.insert();
			}
			if (solId) {
				count++;
				this._copyAdvancedParameterRecord(solDef.getUniqueValue(), solId);
			}
		}
		return count;
	},

	_copyFields: function(sourceGr, targetGr) {
		var sourceFields = sourceGr.getFields();
		for (var i = 0; i < sourceFields.size(); i++) {
			var element = sourceFields.get(i);
			if (!element.getName().includes('sys_') && !element.getName().includes('solution_name')) {
				targetGr.setValue(element.getName(), element.getValue());
			} else if (element.getName().includes('sys_scope')) {
				targetGr.setValue(element.getName(), element.getValue());
			}
		}
	},

	_getNewFilter: function(solDef, groupby, colName) {
		var gr = new GlideRecord(solDef.table);
		gr.addEncodedQuery(solDef.filter);
		gr.addQuery(groupby,colName);
		return gr.getEncodedQuery();
	},

	_copyAdvancedParameterRecord: function(parentSysId, childSysId) {
		var parentSettings = [];
		var advancedSettings = new GlideRecord("ml_advanced_solution_settings");
		advancedSettings.addQuery("ml_capability_definition", parentSysId);
		advancedSettings.addEncodedQuery("solution_parameters!=a59e57bd5f673300d1dc4560be7313b1");
		advancedSettings.query();
		while (advancedSettings.next()) {
			parentSettings.push(advancedSettings.getValue("solution_parameters"));
			var childAdvancedSettings = new GlideRecord("ml_advanced_solution_settings");
			childAdvancedSettings.addQuery("ml_capability_definition", childSysId);
			childAdvancedSettings.addQuery("solution_parameters",advancedSettings.getValue("solution_parameters"));
			childAdvancedSettings.query();
			var recordExist = childAdvancedSettings.next();
			if (!recordExist) {
				childAdvancedSettings = new GlideRecord("ml_advanced_solution_settings");
			}
			for(var colName in advancedSettings) {
				childAdvancedSettings.setValue(colName,advancedSettings.getValue(colName));
			}
			childAdvancedSettings.setValue("ml_capability_definition", childSysId);
			if (recordExist)
				childAdvancedSettings.update();
			childAdvancedSettings.insert();
		}
		var childAdvancedSetting = new GlideRecord("ml_advanced_solution_settings");
		childAdvancedSetting.addQuery("ml_capability_definition", childSysId);
		childAdvancedSetting.addQuery("solution_parameters", 'NOT IN', parentSettings);
		childAdvancedSetting.query();
		childAdvancedSetting.deleteMultiple();
	},
	
    type: 'MLGroupbyUtils'
};
```
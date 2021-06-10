---
title: "CloneSurvey"
id: "clonesurvey"
---

API Name: global.CloneSurvey

```js
var CloneSurvey = Class.create();
var metricDefinitionMap = {};
CloneSurvey.prototype = {
    initialize: function() {
		this.allMetricMap = {};
		new SNC.NGAssessmentUtil.setAssessmentAction("clone");
    },
	
	cloneMetricType: function(currentMetricType) {
		var oldMetricTypeSysID = currentMetricType.getUniqueValue();
		currentMetricType.name = gs.getMessage("Copy of {0}", currentMetricType.name);
		
		if (currentMetricType.evaluation_method != 'vdr_risk_asmt')
			currentMetricType.publish_state = 'draft';
		if (currentMetricType.evaluation_method === 'quiz')
			currentMetricType.condition = '';
		var newMetricTypeSysID = currentMetricType.insert();
		// clone data from asmt_metric_category
		this.cloneMetricCategory(oldMetricTypeSysID, newMetricTypeSysID);
		// clone sample metric and corresponding attachments
		this.cloneSampleMetric(oldMetricTypeSysID, newMetricTypeSysID, currentMetricType.getValue("sample_metric"));
		return newMetricTypeSysID;
	},
	
	cloneMetricCategory: function(oldMetricTypeSysID, newMetricTypeSysID) {
		var met_cat = new GlideRecord('asmt_metric_category');
		met_cat.query("metric_type", oldMetricTypeSysID);
		while (met_cat.next()) {
			var catID = met_cat.getValue('sys_id');
			met_cat.metric_type = newMetricTypeSysID;
			var newCatID = met_cat.insert();
			// clone data from asmt_metric
			this.cloneMetric(oldMetricTypeSysID, newMetricTypeSysID, catID, newCatID);
		}
	},
	
	cloneMetric: function(oldMetricTypeSysID, newMetricTypeSysID, catID, newCatID) {
		var metricMap = {};
		var metricDefinitionMap = {};
		var asmtMetric = new GlideRecord('asmt_metric');
		if(oldMetricTypeSysID !== '')
			asmtMetric.addQuery("metric_type", oldMetricTypeSysID);
		asmtMetric.addQuery("category", catID);
		asmtMetric.query();
		while (asmtMetric.next()) {
			var oldMetricId = asmtMetric.getUniqueValue();
			asmtMetric.metric_type = newMetricTypeSysID;
			asmtMetric.category = newCatID;
			var newMetricId = asmtMetric.insert();
			// store dependency and correct answer info in metricMap
			var metricObj = { 'newMetricId': newMetricId, 'depends_on': asmtMetric.depends_on + '', 'displayed_when': asmtMetric.displayed_when + '', 'correct_answer_choice': asmtMetric.correct_answer_choice + '' };
			metricMap[oldMetricId] = metricObj;
			this.allMetricMap[oldMetricId] = metricObj;
			if (asmtMetric.getValue("datatype") === "imagescale")
				metricDefinitionMap = this.cloneMetricDefinition(oldMetricId, newMetricId, true, metricDefinitionMap);
			else
				metricDefinitionMap = this.cloneMetricDefinition(oldMetricId, newMetricId, false, metricDefinitionMap);
		}
		this.updateDependencies(metricMap, metricDefinitionMap);
	},
	
	updateDependencies: function(metricMap, metricDefinitionMap) {
		// fill in dependency and correct answer info for metrics
		for (var key in metricMap) {
			var metricObj = metricMap[key];
			if (gs.nil(metricObj.depends_on) && gs.nil(metricObj.displayed_when) && gs.nil(metricObj.correct_answer_choice))
				// skip if it is not a dependent metric and has no correct answer choice
				continue;
			var metric = new GlideRecord('asmt_metric');
			metric.get(metricObj.newMetricId);
			if (!metric.isValidRecord())
				continue;
			if (!gs.nil(metricObj.depends_on))
				metric.depends_on = metricMap[metricObj.depends_on].newMetricId;
			var listFields = ['displayed_when', 'correct_answer_choice'];
			listFields.forEach(function(field) {
				if (gs.nil(metricObj[field]))
					return;
				var oldList = metricObj[field].split(',');
				var newList = [];
				oldList.forEach(function(oldDefId) {
					newList.push(metricDefinitionMap[oldDefId]);
				}, this);
				metric[field] = newList.join(',');
			}, this);
			metric.update();
		}
	},
	
	cloneMetricDefinition: function(oldMetricId, newMetricId, callAttachments, metricDefinitionMap) {
		var met_def = new GlideRecord('asmt_metric_definition');
		met_def.query("metric", oldMetricId);
		while (met_def.next()) {
			var oldDefId = met_def.getUniqueValue();
			met_def.metric = newMetricId;
			var newDefId = met_def.insert();
			metricDefinitionMap[oldDefId] = newDefId;
			if (callAttachments)
				this.cloneAttachments('asmt_metric_definition', oldDefId, newDefId);
		}
		return metricDefinitionMap;
	},
	
	cloneAttachments: function(tableName, oldRecordID, newRecordID, newFileName) {
		//copy the image attachments for imagescale question
		if (gs.nil(newFileName))
			GlideSysAttachment.copy(tableName, oldRecordID, tableName, newRecordID);
		else
			GlideSysAttachment.copy(tableName, oldRecordID, tableName, newRecordID, newFileName);
	},
	
	cloneSampleMetric: function(oldMetricTypeSysID, newMetricTypeSysID, oldSampleMetricID) {
		var gr = new GlideRecord("asmt_metric_type");
		if (!gr.get(newMetricTypeSysID))
			return;

		var newSampleMetricID = this.allMetricMap[oldSampleMetricID].newMetricId;
		if (!gs.nil(newSampleMetricID)) {
			gr.setValue("sample_metric", newSampleMetricID);
			gr.update();
			this.cloneAttachments("asmt_metric_type", oldMetricTypeSysID, newMetricTypeSysID, "sample_metric_image_" + newSampleMetricID + ".png");
		}
	},
    
	type:'CloneSurvey'
};
```
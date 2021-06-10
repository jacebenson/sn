---
title: "ChatSurveyUtil"
id: "chatsurveyutil"
---

API Name: global.ChatSurveyUtil

```js
var ChatSurveyUtil = Class.create();
ChatSurveyUtil.prototype = {
    initialize: function() {
    },
	
	unsupportedTypes: ['multiplecheckbox', 'ranking', 'template'],

	isMetricTypeSupported: function(typeId) {
		var result = {
			success: true,
			msg: ''
		};
		var unsupportedTypesFound = [];
		
		var categoryCount = this.getCategoryCount(typeId);
		
		if (categoryCount > 1) {
			result.success = false;
			if (result.msg)
				result.msg += ";";
			result.msg += gs.getMessage("For Chat Survey, all questions must belong to a single category");
		}
		
		if (categoryCount == 0)
			return result;
		
		var metric = new GlideRecord('asmt_metric');
		metric.addQuery('metric_type', typeId);
		metric.addNotNullQuery('category');
		metric.query();
		while (metric.next()) {
			var datatype = metric.datatype.toString();
			if (this.unsupportedTypes.indexOf(metric.datatype.toString()) > -1) {
				var datatypeLabel = metric.datatype.getDisplayValue();
				if (unsupportedTypesFound.indexOf(datatypeLabel) == -1)
					unsupportedTypesFound.push(datatypeLabel);
			}
		}

		if (unsupportedTypesFound.length > 0) {
			result.success = false;
			if (result.msg)
				result.msg += ";";
			result.msg += gs.getMessage("The following question types are not compatible with Chat Survey: {0}", unsupportedTypesFound.join(", "));
		}
		
		if (result.success)
			result.msg = gs.getMessage("This survey is compatible with Chat Survey");
		
		return result;
	},

	isMetricSupported: function(metric) {
		var result = {
			success: true,
			msg: ''
		};

		if (this.unsupportedTypes.indexOf(metric.datatype.toString()) > -1) {
			result.success = false;
			if (result.msg)
				result.msg += ";";
			result.msg += metric.datatype.getDisplayValue() + " type questions are not compatible with Chat Survey";
		}
		if (result.success)
			msg = "This metric is compatible with Chat Survey";
		
		return result;
	},
	
	getCategoryCount: function(typeId) {
		var categoryCount = 0;
		var count = new GlideAggregate('asmt_metric_category');
		count.addQuery('metric_type', '=', typeId);
		count.addAggregate('COUNT');
		count.query();
		if (count.next())
			categoryCount = count.getAggregate('COUNT');
		
		return categoryCount;
	},
	
    type: 'ChatSurveyUtil'
};
```
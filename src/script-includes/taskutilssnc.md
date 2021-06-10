---
title: "TaskUtilsSNC"
id: "taskutilssnc"
---

API Name: global.TaskUtilsSNC

```js
var TaskUtilsSNC = Class.create();
TaskUtilsSNC.prototype = {

    initialize: function() {
    },

	PROPERTIES : {
		PRINCIPAL_CLASS_FILTER_PROPERTY : 'com.snc.task.principal_class_filter'
	},

	CONSTANTS: {
		OPS_FILTER_CLASSNAMES: ['incident', 'problem'] // task types for which the operational status filter will be applied
	},

	getConfigurationItemFilter: function(current) {
		if (!current) {
			gs.error("[TaskUtilsSNC.getConfigurationItemFilter] : Invalid parameter");
			return;
		}

		var configItemFilter = '';
		var serviceOfferingFilter = 'sys_class_name!=service_offering';

		configItemFilter += serviceOfferingFilter;

		if (this.CONSTANTS.OPS_FILTER_CLASSNAMES.indexOf(current.sys_class_name + '') > -1)
			configItemFilter += "^operational_statusNOT IN" + new OpsStatusFilter('cmdb_ci').by('CreateTask').join();

		var principalClassFilter = this.getPCFilterEvaluated(current.sys_class_name + '');
		if (principalClassFilter.length > 0)
			configItemFilter += '^' + principalClassFilter;

		return configItemFilter;
	},

	getPCFilterEvaluated: function (className) {
		var pcFilterProperty = gs.getProperty(this.PROPERTIES.PRINCIPAL_CLASS_FILTER_PROPERTY, '');
		if (pcFilterProperty.length > 0 && pcFilterProperty.split(',').indexOf(className) > -1) {
			var principalClasses = new PrincipalClass().getPrincipalClasses().join(',');
			if (principalClasses.length > 0)
				return "sys_class_nameIN" + principalClasses;
		}
		return '';
	},
    type: 'TaskUtilsSNC'
};
```
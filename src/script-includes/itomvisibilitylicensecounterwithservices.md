---
title: "ITOMVisibilityLicenseCounterWithServices"
id: "itomvisibilitylicensecounterwithservices"
---

API Name: global.ITOMVisibilityLicenseCounterWithServices

```js
var ITOMVisibilityLicenseCounterWithServices = Class.create();
ITOMVisibilityLicenseCounterWithServices.prototype = Object.extendsObject(ITOMVisibilityLicenseCounter, {

	initialize: function() {
		ITOMVisibilityLicenseCounter.prototype.initialize.call(this);
		this.licensingUtil = new SNC.LicensingUtil();
		this.licensableTypes = gs.getProperty('itom.visibility.licensable_service_types', '').split(',');
		this.ciClassNames = ['cmdb_ci_server', 'cmdb_ci_vm_instance'];
    },
	
	// @Override
	_addCountConditions: function(gr, excludedStatus, allowedSources, dateFilter) {
		if (this.ciClassNames.indexOf(gr.getTableName()) == -1) {
			ITOMVisibilityLicenseCounter.prototype._addCountConditions.call(this, gr, excludedStatus, allowedSources, dateFilter);
			return;
		}

		// build the AND conditions for getting the count of CIs
		var conditions = [
			this._getCountCondition(excludedStatus),
			this._getSourceCondition('sys_id', allowedSources, dateFilter)
		];

		// now lets add our services condition ... (this will be an OR from the previous conditions)
		this.licensingUtil.addServiceAssociationCondition(gr, conditions, this.licensableTypes, "sys_id");
	},

	/*******************************************************
	****    EX END RESULT SQL QUERY:
	********************************************************

SELECT count(*) AS recordcount FROM (cmdb_rel_ci cmdb_rel_ci0  LEFT JOIN cmdb_rel_type cmdb_rel_type1 ON cmdb_rel_ci0.`type` = cmdb_rel_type1.`sys_id` )  
WHERE cmdb_rel_type1.`name` IN ('Instantiates::Instantiated by' , 'Virtualized by::Virtualizes') 
AND ((cmdb_rel_ci0.`child` IN (SELECT sys_object_source0.`target_sys_id` 
FROM sys_object_source sys_object_source0  
WHERE ((sys_object_source0.`last_scan` >= '2019-12-18 08:00:00' AND sys_object_source0.`last_scan` <= '2020-03-18 06:59:59') 
AND sys_object_source0.`name` IN ('ServiceNow' , 'ServiceWatch' , 'Service-now' , 'AgentClientCollector'))) 
AND cmdb_rel_ci0.`child` IN (SELECT cmdb0.`sys_id` FROM cmdb cmdb0  WHERE cmdb0.`sys_class_path` LIKE '/!!/!)/!*%' 
AND (cmdb0.`install_status` NOT IN (7 , 8 , 100) AND cmdb0.`duplicate_of` IS NULL ))) 
OR cmdb_rel_ci0.`child` IN (SELECT svc_model_assoc_ci0.`ci_id` FROM svc_model_assoc_ci svc_model_assoc_ci0  
WHERE svc_model_assoc_ci0.`environment` IN (SELECT svc_layer0.`environment` FROM svc_layer svc_layer0  
WHERE svc_layer0.`sys_id` IN (SELECT cmdb0.`a_ref_3` AS `layer` FROM cmdb cmdb0  
WHERE cmdb0.`sys_class_path` LIKE '/!!/#C/!#/!!%' AND cmdb0.`a_int_2` = 4)))) 
AND ((cmdb_rel_ci0.`parent` IN (SELECT sys_object_source0.`target_sys_id` 
FROM sys_object_source sys_object_source0  WHERE ((sys_object_source0.`last_scan` >= '2019-12-18 08:00:00' 
AND sys_object_source0.`last_scan` <= '2020-03-18 06:59:59') AND sys_object_source0.`name` 
IN ('ServiceNow' , 'ServiceWatch' , 'Service-now' , 'AgentClientCollector'))) 
AND cmdb_rel_ci0.`parent` IN (SELECT cmdb0.`sys_id` FROM cmdb cmdb0  
WHERE cmdb0.`sys_class_path` LIKE '/!!/!2/!(/!!%' AND (cmdb0.`install_status` NOT IN (7 , 8 , 100) 
AND cmdb0.`duplicate_of` IS NULL ))) OR cmdb_rel_ci0.`parent` IN (SELECT svc_model_assoc_ci0.`ci_id` 
FROM svc_model_assoc_ci svc_model_assoc_ci0  WHERE svc_model_assoc_ci0.`environment` 
IN (SELECT svc_layer0.`environment` FROM svc_layer svc_layer0  WHERE svc_layer0.`sys_id` 
IN (SELECT cmdb0.`a_ref_3` AS `layer` FROM cmdb cmdb0  WHERE cmdb0.`sys_class_path` LIKE '/!!/#C/!#/!!%' AND cmdb0.`a_int_2` = 4))))

	*******************************************************/

	// @Override
	_addDeduplicationVmConditions: function(gr, excludedStatus, allowedSources, dateFilter) {
		// first build the conditions for making sure the child (cmdb_ci_vm_instance) is one that we previously counted
		var conditions = [
			this._getSourceCondition('child', allowedSources, dateFilter),
			this._getDeduplicationCondition('cmdb_ci_vm_instance', 'child', excludedStatus)
		];

		// now add our services condition...
		this.licensingUtil.addServiceAssociationCondition(gr, conditions, this.licensableTypes, "child");

		// then build the conditions for making sure the parent (cmdb_ci_server) is one that we previously counted
		conditions = [
			this._getSourceCondition('parent', allowedSources, dateFilter),
			this._getDeduplicationCondition('cmdb_ci_server', 'parent', excludedStatus),
		];

		// now add our services condition ... (this will be an AND from the previous call's conditions)
		this.licensingUtil.addServiceAssociationCondition(gr, conditions, this.licensableTypes, "parent");
	},
	
	/*******************************************************
	****    LIST OF QUERY CONDITIONS
	*******************************************************/

	_getCountCondition: function(excludedStatus) {
		// Using some helper GlideRecord, otherwise the query will not be built as expected
		var helperGr = new GlideRecord('cmdb_ci_server');
		var qc = helperGr.addQuery('duplicate_of', 'NULL');
		qc.addCondition('install_status', 'NOT IN', excludedStatus.join(","));

		return qc;
	},

	_getSourceCondition: function(ref, allowedSources, dateFilter) {
		// Using some helper GlideRecord, otherwise the query will not be built as expected
		var helperGr = new GlideRecord('cmdb_ci_server');
		var qc = helperGr.addJoinQuery('sys_object_source', ref, 'target_sys_id');
		qc.addCondition('name', 'IN', allowedSources.join(","));
		qc.addCondition('last_scan', 'ON', dateFilter);

		return qc;
	},

	_getDeduplicationCondition: function(table, ref, excludedStatus) {
		// Using some helper GlideRecord, otherwise the query will not be built as expected
		var helperGr = new GlideRecord('cmdb_rel_ci');
		var qc = helperGr.addJoinQuery(table, ref, 'sys_id');
		qc.addCondition('duplicate_of', 'NULL');
		qc.addCondition('install_status', 'NOT IN', excludedStatus.join(","));

		return qc;
	},

    type: 'ITOMVisibilityLicenseCounterWithServices'
});
```
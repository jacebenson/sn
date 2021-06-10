---
title: "AbstractApplicationServicePopulator"
id: "abstractapplicationservicepopulator"
---

API Name: global.AbstractApplicationServicePopulator

```js
var AbstractApplicationServicePopulator = Class.create();
AbstractApplicationServicePopulator.prototype = {
    initialize: function() {
    },
	
	process: function(serviceRecord, mode) {
		gs.info("SBT: Starting to populate service : {0}, sysId : {1}", serviceRecord.getValue('name'), serviceRecord.getValue('sys_id'));
		var serviceRelations = this.getServiceRelations(serviceRecord, mode);
		if (!serviceRelations)
			return;
		
		var payload = {};
		payload.name = serviceRecord.getValue('name');
		payload.service_relations = serviceRelations;
		var payloadStr = new JSON().encode(payload);
		gs.debug("SBT: Calling method CreateOrUpdateITService" );
		var createOrUpdate = new CreateOrUpdateITService();
		createOrUpdate.processJSON(payloadStr);
		gs.info("SBT: Finished to populate service : {0}, sysId : {1}", serviceRecord.getValue('name'), serviceRecord.getValue('sys_id'));
	},
	
	/**
	 * Returns a list of pairs of parent CI and child CI, which is used for populating the service.
	 * At least one of the pairs should have an empty parent (""), indicating the entry point of the
	 * service.
	 * Example: [{"parent":"", "child":"c1"}, {"parent":"c1", "child":"c2"}]
	 */
	getServiceRelations: function(serviceRecord, mode) {
		throw "Not Implemented";
	},
	
	/**
	 * This method is called from the service populator engine before calling the process method.
	 * Returns true if the populator should run.
	 */
	shouldProcess: function(serviceRecord, mode) {
		return true;
	},
	
	/**
	 * This method is called from the service populator engine in case the shouldRun method returns false.
	 */
	onReject: function(serviceRecord, mode) {
	},

    type: 'AbstractApplicationServicePopulator'
};
```
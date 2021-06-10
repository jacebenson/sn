---
title: "SaViewServiceMap"
id: "saviewservicemap"
---

API Name: global.SaViewServiceMap

```js
var SaViewServiceMap = Class.create();
SaViewServiceMap.prototype = {
	_ERR_NO_ENTRY_POINTS: gs.getMessage("No map available, please add an entry point"),
	_ERR_OPERATIONAL_NOT_SUPPORTED: gs.getMessage("Not operational service map cannot be viewed by current user."),

    initialize: function() {
    },

	/**
	 * @param bsId - id of business service.
	 * If service mpa can be opened - the object with "url" returned.
	 * Otherwise, an object with "message" returned. "message" contains translated message for user.
	 */
	getMapUrl: function(bsId, dontValidateEntryPoints) {
		var user = GlideUser.getCurrentUser();
		var canEdit = user.hasRole("app_service_admin");
		var isAppOwner = user.hasRole("sm_app_owner");
	
		var currName;
		var isOperational = false;
		var serviceGr = new GlideRecord('cmdb_ci_service');
		if (serviceGr.get(bsId)) {
			currName = encodeURIComponent(serviceGr.getValue('name'));
			isOperational = serviceGr.getValue('operational_status') == 1;
		}
		
		if (!canEdit && !isAppOwner && !isOperational) {
			return {
					"message": this._ERR_OPERATIONAL_NOT_SUPPORTED
				};
		}
		
		if (!dontValidateEntryPoints) {
			var entryPointsGr = new GlideRecord('sa_m2m_service_entry_point');
			entryPointsGr.addQuery('cmdb_ci_service', bsId);
			entryPointsGr.query();
			if (!entryPointsGr.next()) {
				return {
					"message": this._ERR_NO_ENTRY_POINTS
				};
			}
		}
		
		return {
			"url": this.buildUrl(bsId, currName)
		};		
	},
	
	/**
	 * Giving sys_id in table sa_service_counters,
	 * returns sys_id of referenced business service for cmdb_ci_service_discovered.
	 * @param sys_id - id of record in sa_service_counters table.
	 * @return service_id for the given record.
	 */
	getServiceIdFromSaCountersId: function(sys_id) {
		var gr = new GlideRecord("sa_service_counters");
		gr.addQuery("sys_id", sys_id);
		gr.query();

		if (gr.next())
			return gr.getValue("service_id");
		
	
		return null;
	},

	buildUrl: function(id, name) {
		return '$sw_topology_map.do?sysparm_bsid=' + id + 
				'&sysparm_bsname=' + name +
				'&sysparm_plugin_mode=mapping';
	},

    type: 'SaViewServiceMap'
};
```
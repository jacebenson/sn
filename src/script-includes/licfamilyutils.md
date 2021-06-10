---
title: "LicFamilyUtils"
id: "licfamilyutils"
---

API Name: global.LicFamilyUtils

```js
var LicFamilyUtils = Class.create();
LicFamilyUtils.prototype = {
    initialize: function() {
    },

	/* TODO: clean up this code */

	getAssocRoleSysIDs: function(familyID) {
		var appFamilyGR = new GlideRecord('ua_app_family');
		appFamilyGR.addQuery('lineage_id', familyID);
		appFamilyGR.query();
		var appids = [];
		while (appFamilyGR.next()) {

			appids.push(appFamilyGR.getValue('app_id'));

			if (JSUtil.notNil(appFamilyGR.getValue("scope")))
				appids.push(appFamilyGR.getValue("scope"));//Get the scope if available
		}
		var assocRoles = [];
		var gar = new GlideAggregate("assoc_roles");
		gar.addQuery('pkg_source', 'IN', appids);
		gar.groupBy('role_sys_name');
		gar.query();

		while(gar.next())
			//Get all the distinct roles
			assocRoles.push(gar.getValue("role_sys_name"));

		var assocRoleSysIDList = [];
		for (var i = 0; i < assocRoles.length; i++) {
			var grAR = new GlideRecord("assoc_roles");
			grAR.addQuery("role_sys_name", assocRoles[i]);
			grAR.query();
			if (grAR.next())
				//Get Sys ID for the distinct role
				assocRoleSysIDList.push(grAR.sys_id.toString());
		}

		return assocRoleSysIDList;
	},

	getAppIDs: function(familyID) {
		var appFamilyGR = new GlideRecord('ua_app_family');
		appFamilyGR.addQuery('lineage_id', familyID);
		appFamilyGR.addQuery('cust_visible', '1');
		appFamilyGR.query();
		var appids = [];
		while (appFamilyGR.next()) {
			appids.push(appFamilyGR.getValue('app_id'));
		}
		return appids;
	},

	getStoreAppIDs: function(familyID) {
		var appFamilyGR = new GlideRecord('ua_app_family');
		appFamilyGR.addQuery('lineage_id', familyID);
		appFamilyGR.addQuery('cust_visible', '1');
		appFamilyGR.query();

		var appids = [];

		while (appFamilyGR.next()) {
			var appId = appFamilyGR.getValue('app_id');
			var pluginGR = new GlideRecord('v_plugin');
			pluginGR.addQuery("id", appId);
			pluginGR.query();
			if(!pluginGR.hasNext()) {
				appids.push(appId);
			}
		}
		return appids;
	},

    type: 'LicFamilyUtils'
};
```
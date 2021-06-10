---
title: "CSDMClientHelper"
id: "csdmclienthelper"
---

API Name: global.CSDMClientHelper

```js
var CSDMClientHelper = Class.create();
CSDMClientHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	searchGroups: function() {
		var sysId = this.getParameter('sysparm_sys_id');
		var queryBasedServiceRecord = new GlideRecordSecure('cmdb_ci_query_based_service');
		if(!queryBasedServiceRecord.canRead())
			return '';
		queryBasedServiceRecord.addQuery('cmdb_group', sysId);
		queryBasedServiceRecord.query();
		
		if (queryBasedServiceRecord.hasNext()) {
			queryBasedServiceRecord.next();
			return queryBasedServiceRecord.getValue('name');
		}
	},
    type: 'CSDMClientHelper'
});
```
---
title: "ITAMLicensingUtils"
id: "itamlicensingutils"
---

API Name: global.ITAMLicensingUtils

```js
var ITAMLicensingUtils = Class.create();
ITAMLicensingUtils.prototype = {
	initialize: function() {
		this.HAM_APP = 'Hardware Asset Management';
		this.ITAM_LICENSING_TABLE = 'itam_licensing_resource_counts';
		this.ITAM_ASSET_USAGE_TABLE = 'itam_asset_usage';
		this.ITAM_CI_USAGE_TABLE = 'itam_ci_usage';
		this.COMPUTERS_CATEGORY = 'end_user_computers';
		this.SERVERS_CATEGORY = 'servers';
		this.NETWORK_GEAR_CATEGORY = 'network_gear';
		this.validTables = [this.ITAM_LICENSING_TABLE,
			this.ITAM_ASSET_USAGE_TABLE,
			this.ITAM_CI_USAGE_TABLE];
	},
	deleteLicensingData: function(gr) {
		var index = this.validTables.indexOf(gr.getTableName());
		if (index >= 0) {
			gr.setWorkflow(false);
			gr.deleteMultiple();
		}
	},
	type: 'ITAMLicensingUtils',
};
```
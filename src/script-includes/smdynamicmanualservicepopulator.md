---
title: "SMDynamicManualServicePopulator"
id: "smdynamicmanualservicepopulator"
---

API Name: global.SMDynamicManualServicePopulator

```js
var SMDynamicManualServicePopulator = Class.create();
SMDynamicManualServicePopulator.prototype = Object.extendsObject(AbstractApplicationServicePopulator, {
	
	process: function(serviceRecord, mode) {
		if (mode == 'SCHEDULED')
			return;
		
		var metadata = serviceRecord.metadata;
		var levels;
		if (metadata) {
			var metadataJson = new JSON().decode(metadata);
			levels = metadataJson.levels;
		}
		
		if (!levels)
			levels = GlideProperties.getInt('svc.manual.convert.levels.default_value', 3);

		var serviceId = serviceRecord.getUniqueValue();
		var bsm = new SNC.BusinessServiceManager();
		var blackListRelations = gs.getProperty("sa.mapping.system.manual.rel_type.blacklist","");
		if (!bsm.populateDiscoveredService(serviceId, parseInt(levels), blackListRelations)) {
			throw 'Failed to populate service. ' + bsm.error;
		}
	},

    type: 'SMDynamicManualServicePopulator'
});
```
---
title: "CloudMidSelectionApi"
id: "cloudmidselectionapi"
---

API Name: global.CloudMidSelectionApi

```js
var CloudMidSelectionApi = Class.create();
CloudMidSelectionApi.prototype = {
    initialize: function() {
    },

	/*
     * Select a single mid for cloud
	 * 
	 * @param: {string} app Application calling this API (e.g. ServiceMapping)
	 * @param: {string} provider provider. This won't be respected if ldc is passed in. Example here is AWS.
	 * @param: {string} ldc Logical data center. 
	 * @param: {object} context Extra context that callers needs to pass through that will be availabe at the MID selection override.   
     */ 	
	selectMid: function(app, provider, ldc, context)
	{
		// initialize
		var midSelector = new SNC.MidSelector();
		var capabilities = [];
		var midServer = '';
				
		// By default we should have cloud management capability - since this is a cloud call
		capabilities.push({'capability' : 'Cloud Management'});
				
		// If ldc is not specified - it is by provider (e.g. Ansible/Puppet)	
		// If ldc is specified we can get provider from ldc
		if (gs.nil(ldc)) {
			if (gs.nil(provider)) 
				throw 'Logical datacenter or provider has to be specified for cloud MID selection';
			
			// Simple add the provider as capability and all done
			capabilities.push({'capability' : provider});
			
		}
		else {
			var glideUtil = new GlideRecordUtil();
			
			// This should not happen - so we should throw an exception rather than simply warn and move on
			var ldcRec = glideUtil.getGlideRecordByAttribute('cmdb_ci_logical_datacenter','region',ldc);			
			if (!ldcRec.next()) 
				throw 'Logical datacenter ' + ldc + ' could not be found!';

			// This should never be null								
			var dcType = ldcRec.getValue('sys_class_name');
			
			// get the provider (cloudType) and add it as a capability
			var capiRec = glideUtil.getGlideRecordByAttribute('sn_capi_provider','datacenter_class',dcType);			
			if (!capiRec.next())
				throw 'Provider not found for datacenterType ' + dcType + '!';
			
			var cloudType = capiRec.getValue('name');
			if (gs.nil(cloudType)) 
				throw 'Provider name is empty for datacenterType ' + dcType + '!';
			
			capabilities.push({'capability' : cloudType, 'value' : ldc});
			
		}	
					
		// Now we have everything set up - call the mid selector API to select one mid
		return midSelector.selectMid(app, null, capabilities, context);
	},
	
	
    type: 'CloudMidSelectionApi'
};
```
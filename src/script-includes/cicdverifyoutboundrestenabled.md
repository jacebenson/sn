---
title: "CICDVerifyOutboundRESTEnabled"
id: "cicdverifyoutboundrestenabled"
---

API Name: sn_cicd_spoke.CICDVerifyOutboundRESTEnabled

```js
var CICDVerifyOutboundRESTEnabled = Class.create();
CICDVerifyOutboundRESTEnabled.prototype = {
    initialize: function() {
    },
	
	verifyoutboundrest : function() {
		var cicd_outbound_rest = gs.getProperty('sn_cicd_spoke.outbound_rest.enabled');
		if (cicd_outbound_rest == 'false') {
			var error_message = 'CICD outbound calls are disabled.';
			gs.error(error_message);    
			throw error_message;
		}
	},

    type: 'CICDVerifyOutboundRESTEnabled'
};
```
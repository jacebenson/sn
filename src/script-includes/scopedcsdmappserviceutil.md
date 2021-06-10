---
title: "ScopedCSDMAppServiceUtil"
id: "scopedcsdmappserviceutil"
---

API Name: global.ScopedCSDMAppServiceUtil

```js
var ScopedCSDMAppServiceUtil = Class.create();
ScopedCSDMAppServiceUtil.prototype = {
    initialize: function() {
    },
	
	// Creates an unpopulated application service and registers it by creating relationships with its upstream business contex
	registerService: function(registrationDetails) {
		var serviceSysId = '';
		var helper = new CSDMAppServiceHelper();
		if(registrationDetails.hasOwnProperty('basic_details')) {
			serviceSysId = helper.createApplicationService(registrationDetails);
			if(JSUtil.nil(serviceSysId)) {
				return serviceSysId;
			} 
			if(registrationDetails.hasOwnProperty('relationships')) {
				helper.createCSDMRelationships(serviceSysId, registrationDetails.relationships);
			}
		}
		return serviceSysId;
	},
	
	// Populates or re-populates the service with its downstream CIs
	populateService: function(serviceSysId, populationDetails) {
		if(JSUtil.nil(serviceSysId) | JSUtil.nil(populationDetails) | !(new GlideRecord('cmdb_ci_service_auto').get(serviceSysId)) | !populationDetails.hasOwnProperty('type'))
			return false;
		var helper = new CSDMAppServiceHelper();
		helper.updateBuildMethod(serviceSysId, [populationDetails]);
	},
	
	// Update basice details of application service and optionally its relationships with its upstream business context
	updateServiceDetails: function(serviceSysId, serviceDetails){
		var helper = new CSDMAppServiceHelper();
		if(serviceDetails.hasOwnProperty('basic_details')) {
			var updated = helper.updateService('', serviceSysId, serviceDetails.basic_details);
			if(JSUtil.nil(updated) || updated !== serviceSysId) {
				return false;
			}
		}
		if(serviceDetails.hasOwnProperty('relationships') ) {
			helper.updateCSDMRel(serviceSysId, serviceDetails.relationships);
		}
		return true;
	},
	
    type: 'ScopedCSDMAppServiceUtil'
};
```
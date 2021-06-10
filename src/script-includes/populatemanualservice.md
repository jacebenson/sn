---
title: "PopulateManualService"
id: "populatemanualservice"
---

API Name: global.PopulateManualService

```js
var PopulateManualService = Class.create();
PopulateManualService.prototype = {
    initialize: function() {
    },
	
	process: function(service_id, levels, isDynamic) {
		// Check for required role (PRB1259050)
		if (!gs.hasRole(('app_service_admin'))) {
			gs.log('Aborting conversion to application service. User does not have the required role');
			return JSON.stringify({
					error_source: 'ACL',
					error_msg: gs.getMessage('User does not have the required role')
				});
		}
		
		if (!this.isITService(service_id)) {
			//PRB1283253: verifying that reclassification was successful, stopping on failure.
			var error = this.convertToITService(service_id, levels, isDynamic);
			if (error)
				return JSON.stringify({
					error_source: 'convertToITService',
					error_msg: error
				});
		}
		
		var bsm = new SNC.BusinessServiceManager();
		var blackListRelations = gs.getProperty("sa.mapping.system.manual.rel_type.blacklist","");
		if (!bsm.populateDiscoveredService(service_id, levels, blackListRelations)) {
			gs.log('Failed to populate service. ' + bsm.error);
			gs.getSession().putClientData('server_error_message',bsm.error);
			return JSON.stringify({
					error_source: 'populateDiscoveredService',
					error_msg: bsm.error
				});
		} else {
			if (isDynamic == 'true') {
				var gr = new GlideRecord('cmdb_ci_service_calculated');
				gr.setWorkflow(false);
				gr.setUseEngines(false);
				if (gr.get(service_id)) {
					gr.setValue('populator_status', '1' /* Ready */);
					gr.update();
				}
			}
		}

		return null;
	},

	isITService: function(service_id) {
		var gr  = new GlideRecord('cmdb_ci_service_discovered');
		if (gr.get(service_id))
			return true;
		return false;
	},

	convertToITService: function(service_id, levels, isDynamic) {
		// Keep flag on the session. this will help us later in business rules on cmdb_ci_service_discovered
		gs.getSession().putProperty("convert_from", "cmdb_ci_service");

		// reclassify to cmdb_ci_service_discovered
		var gr = new GlideRecord('cmdb_ci_service');
		gr.get(service_id);

		var reclassifiedGr = null;
		var error;

		//PRB1283253: catching error state from reclassifier. Printing message to user.
		try {
			var targetClass = isDynamic == 'true' ? 'cmdb_ci_service_calculated' : 'cmdb_ci_service_discovered';
			var rci = SncReclassifyCI.createFromGlideRecord(gr, targetClass);
			rci.setReason("UI action Convert to Application Service");
			reclassifiedGr = rci.reclassify();

		} catch (e) {
			error = e.getMessage();
		}

		gs.getSession().clearProperty("convert_from");

		if (null === reclassifiedGr) {
			if (error) {
				error = gs.getMessage('Service CI re-classification failed: {0}', error);
			} else {
				error = gs.getMessage('Service CI re-classification failed!');
			}

			gs.addErrorMessage(error);
			return error;
		} else {
			if (isDynamic == 'true') {
				reclassifiedGr.setValue('service_populator', '11f01e3dc3f23300daa79624a1d3ae32' /* populator sys_id */);
				reclassifiedGr.setValue('type', '5' /* Dynamic */);
				reclassifiedGr.setValue('metadata', JSON.stringify({'levels' : levels}));
			}
			reclassifiedGr.setValue('service_classification', 'Application Service');
			reclassifiedGr.update();
		}
	},

    type: 'PopulateManualService'
};
```
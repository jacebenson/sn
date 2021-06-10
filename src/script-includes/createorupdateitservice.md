---
title: "CreateOrUpdateITService"
id: "createorupdateitservice"
---

API Name: global.CreateOrUpdateITService

```js
var CreateOrUpdateITService = Class.create();
var msg = "";

CreateOrUpdateITService.prototype = {

	initialize: function() {
    },

	/**
	* iterate over the list of key of manual endpoints in the before, and check if they exist now.
	* if not, delete those manual endpoints
	*/
	removeOutdatedManualEndpoints : function(manualEpBefore, manualEpAfter) {
		// Build map of manual endpoints now for performance
		var mapManualEpAfter = {};
		for (var rel in manualEpAfter)
			mapManualEpAfter[rel] = 1;
		
		for (var manualEp in manualEpBefore) {
			if (!mapManualEpAfter[manualEp]) {
				var manualEpGr = new GlideRecord('cmdb_ci_endpoint_manual');
				var manualEpId = manualEpBefore[manualEp];
				if (manualEpId && manualEpGr.get(manualEpId)) {
					manualEpGr.deleteRecord();
				}
			}
		}
	},
	
	/**
	* create map containing all the manual endpoints in the service. the key is parent-child
	*/
	getManualEndpointsInService : function(bsId) {
		var gr = new GlideRecord('cmdb_ci_service_discovered');
		gr.get(bsId);
		var layerId= gr.layer;
		var layerGr= new GlideRecord('svc_layer');
		var manualEpMap = {};
		layerGr.get(layerId);
		var  allCis = sn_svcmod.ServiceContainerFactory.queryCIsAssociatedWithEnvironment(layerGr.environment);
		for (var i = 0; i<allCis.length ; i++) {
			var ciId = allCis[i];
			var manualEpGr = new GlideRecord('cmdb_ci_endpoint_manual');
			if (manualEpGr.get(ciId)) {
				var parent = manualEpGr.source_ci;
				var child = manualEpGr.target_ci;
				if (!parent) 
					parent = '';
				var key = parent + '-' + child;
				manualEpMap[key] = manualEpGr.getUniqueValue();
			}
		}
		return manualEpMap;
	},
	/**
	* fill the gliderecord with relevant fields from JSON
	*/
	populateServiceFields : function(gr, jsonObj) {
		// Iterate over the fields in the upper level of the JSON. ignore items and relations
		for (var fieldName in jsonObj) {
			if (fieldName == 'relations' || fieldName == 'items')
				continue;
			gr.setValue(fieldName, jsonObj[fieldName]);
		}
	},
	
	/*
	* populagte the msg member and throw exception
	*/
	throwError : function (err) {
		msg = err;
		gs.log("msg = " + msg);
		throw new sn_ws_err.BadRequestError(err);
	},
	
	/*
	* create a key to a relation based on parent and child
	*/
	createRelationKey : function (rel) {
		var parent = rel['parent'];
		if (!parent)
			parent = '';
		var child = rel['child'];
		if (!child) {
			this.throwError(gs.getMessage("Invalid relation in input. The child attribute must not be empty"));
		}
		var relKey = parent + '-' + child;
		return relKey;
	},
	
	/*
	* process the input request. Create or udpate a service and populate it with CIs
	*/
	process : function(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
		var body = "";		

		response.setStatus(200);
		response.setContentType('application/json');

		try {
			body = GlideStringUtil.getStringFromStream(request.body.dataStream);
		
			if (GlideStringUtil.nil(body)) {
				throw new sn_ws_err.BadRequestError( gs.getMessage("Wrong input for creation or update of a service. input must not be empty") );
			} else {
				var responseObj = this.processJSON(body);
				response.setBody(responseObj);
			}
		}catch (e){
			response.setStatus= 400;
			msg = gs.getMessage("Add or create service failed: {0}", msg);
			throw new sn_ws_err.BadRequestError(msg);
		}

	},


	/*
	* process the input JSON. Create or udpate a service and populate it with CIs
	*/
	processJSON : function(jsonBody) {
		var json = "";
		var bsId = "";
		var errorId = "";
		var infoMessage = "";
		var responseObj = {};
		var manualEpBeforeChange;
	
		var bsm = new SNC.BusinessServiceManager();

				try {
					json = JSON.parse(jsonBody);
				}
				catch (eJson) {
					msg = gs.getMessage("Wrong input for creation or update of a service, input must be JSON. {0}", eJson);
				}
				
				var bsName = json.name;
				if (bsName == '') {
					msg = gs.getMessage("Wrong input for creation or update of a service, The business service name must not be empty");	
				}
				
				// Insert or update the business service record
				if (msg === "") {
					var bsGr = new GlideRecord('cmdb_ci_service_discovered');
					bsGr.addQuery('name', bsName);
					bsGr.query();
					if (bsGr.next()) {
						// Validate the service_type is manual or empty
						if (bsGr.type == '2') {
							this.throwError(gs.getMessage("This API is allowed to operate only on empty or manual service. This service contains discovered elements"));
						}       
						this.populateServiceFields(bsGr, json);
						bsGr.update();
						bsId = bsGr.getUniqueValue();
					} else {
						this.populateServiceFields(bsGr, json);
						bsId = bsGr.insert();
						if (!bsId) {
							this.throwError(gs.getMessage("Failed to insert a new business service. Insertion was probably blocked by business rule"));
						}
					}
				
					var responseString = '/api/now/table/cmdb_ci_service_discovered/' + bsId;
					responseObj['url'] = responseString;
					responseObj['getContentUrl'] = '/api/now/cmdb/app_service/' + bsId + "/getContent";

				}
			
				var cisAdded = {};
				var relationsAdded = {};
									
				// Collect the manual endpoints in the service before the change
				manualEpBeforeChange = this.getManualEndpointsInService(bsId);

				// Iterate over relations
				var rels = json['service_relations'];
				var somethingChanged = true;
				if (rels) {
					for (var level = 0; level < 100 && somethingChanged; level++) {
						somethingChanged = false;
						for (var i = 0;i<rels.length ; i++) {
							var rel = rels[i];
							var parent = rel['parent'];
							if (!parent)
								parent = '';
							var child = rel['child'];
							var relKey = this.createRelationKey(rel);
							if (relationsAdded[relKey]) // we already handled this relation
								continue;
							if (!parent) { // this is an entry point
								msg = bsm.addCI(bsId, parent, child);
								if (msg)
									throw new sn_ws_err.BadRequestError(msg);
								somethingChanged = true;
								cisAdded[child] = true;
								relationsAdded[relKey] = true;
								continue;
							}
							// If the parent was already added, we can add the child
							if (cisAdded[parent]) {
								msg = bsm.addCI(bsId, parent, child);
								if (msg)
									throw new sn_ws_err.BadRequestError(msg);
								cisAdded[child] = true;
								relationsAdded[relKey] = true;
								continue;
							}
						} // end of loop on relations
					} // end of loop over levels
			    
					// Check for dangling relations
					for (var j = 0;j < rels.length ; j++) {
						var rel1 = rels[j];
						var relKey1 = this.createRelationKey(rel1);
						if (!relationsAdded[relKey1]) 
							this.throwError(gs.getMessage('Relation from parent {0} to child {1} is dangling. The parent is not part of the service', [rel1['parent'], rel1['child']]));
					}

				} // End of handle relations
			
				// Remove endpoints if needed
				this.removeOutdatedManualEndpoints(manualEpBeforeChange, relationsAdded);
				
				// Report on the number of CIs added to the service
				var ciCount = 0;
				for (var ci in cisAdded) ciCount++;
				infoMessage = gs.getMessage('{0} CIs added to business service', ciCount + '');
				responseObj['info'] = infoMessage;
		
		if (msg !== "") {
			throw new sn_ws_err.BadRequestError(msg);
		}

		return responseObj;
	},
	
	addCI : function(bsID, sourceCiId , targetCIId) {
		var bsm = new SNC.BusinessServiceManager();
		return bsm.addCI(bsID, sourceCiId, targetCIId);
	},
	
	removeCI : function(bsID, ciSysID) {
		var bsm = new SNC.BusinessServiceManager();
		return bsm.removeManualCi(ciSysID, bsID);
	},

	
    type: 'CreateOrUpdateITService'
};
```
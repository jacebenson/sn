---
title: "GetITService"
id: "getitservice"
---

API Name: global.GetITService

```js
var GetITService = Class.create();
var msg = "";

GetITService.prototype = {

	initialize: function() {
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
	* process the input JSON. Create or udpate a service and populate it with CIs
	*/
	process : function(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
	
		var bsId = request.pathParams.sys_id + '';
		var errorId = "";
		var responseObj = {};
		responseObj['relations'] = [];
		var manualEpBeforeChange;
		var modeParam = request.queryParams["mode"];
		var shallow = true;
		if (modeParam && modeParam == 'full')
			shallow = false;

		response.setStatus(200);
		response.setContentType('application/json');
	
		try {
				
			var bsGr = new GlideRecord('cmdb_ci_service_discovered');
			if (!bsGr.get(bsId))
				this.throwError(gs.getMessage("Business service {0} not found in the CMDB", bsId));
						
			// Validate the service_type is manual or empty
			if (bsGr.type == '2') 
				this.throwError(gs.getMessage("This API is allowed to operate only on empty or manual service. This service contains discovered elements"));
			var responseString = '/api/now/table/cmdb_ci_service_discovered/' + bsId;
			responseObj['url'] = responseString;
			responseObj['name'] = bsGr.name;
			response.setBody(responseObj);
			
			var bsm = new SNC.BusinessServiceManager();
			var serviceJson = bsm.getService(bsId, shallow);
			if (bsm.error)
				msg = bsm.error;
 		    var writer = response.getStreamWriter();
		    writer.writeString(serviceJson);
			
		}catch (e){
			// Build the error message
			if (!msg)
			    msg = gs.getMessage("Failed to get service content: {0}", e.message);
			else
				msg = gs.getMessage("Failed to get service content: {0}", msg);
		}
		
		if (msg !== "") {
			response.setStatus= 400;
			throw new sn_ws_err.BadRequestError(msg);
		}
	},
    type: 'GetITService'
};
```
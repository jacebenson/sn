---
title: "SaOperationsWrapper"
id: "saoperationswrapper"
---

API Name: global.SaOperationsWrapper

```js
var SaOperationsWrapper = Class.create();
SaOperationsWrapper.prototype = {
	initialize: function(handlerClass) {
		this.handler = new handlerClass();
	},
	
	process: function(request, response, action, hasBody) {
		
		//extract parameters from request and create paramsDTO
		var paramsDTO = new SNC.RequestParametersDTO();
		var queryParams = request.queryParams;
		for (var queryParam in queryParams) {
			if (queryParams.hasOwnProperty(queryParam))
				paramsDTO.setParameter(queryParam, queryParams[queryParam]);
		}
		
		if (hasBody) {
			var bodyParams;
			var requestBody = request.body;
			var requestData = requestBody.data; //May be an array or a single object
			if (requestData instanceof Array) {
				bodyParams = requestData[0];
			}
			else {
				bodyParams = requestData;
			}
			for (var bodyParam in bodyParams) {
				if (bodyParams.hasOwnProperty(bodyParam))
					paramsDTO.setParameter(bodyParam, bodyParams[bodyParam]);
			}
		}
		
		var responseString = String(this.handler.callAction(action, paramsDTO));
		
		response.setStatus(this.handler.getResponseStatus());
		response.setContentType(this.handler.getResponseContentType());
		
		var writer = response.getStreamWriter();
		writer.writeString(responseString);
	},
	
	processStreams: function(request, response, action, hasBody) {
		//extract parameters from request and create paramsDTO
		var paramsDTO = new SNC.RequestParametersDTO();
		var queryParams = request.queryParams;
		for (var queryParam in queryParams) {
			if (queryParams.hasOwnProperty(queryParam))
				paramsDTO.setParameter(queryParam, queryParams[queryParam]);
		}
		
		if (hasBody) {
			var requestBody = request.body;
		    var inputDataStream = requestBody.dataStream;
			var outputStream = response.getStreamWriter();
            this.handler.callActionStream(action, paramsDTO, inputDataStream, outputStream);
		} else {
			this.handler.callActionStream(action, paramsDTO, null, response.getStreamWriter());
		}
		
		response.setStatus(this.handler.getResponseStatus());
	
	},

	
	type: 'SaOperationsWrapper'
};
```
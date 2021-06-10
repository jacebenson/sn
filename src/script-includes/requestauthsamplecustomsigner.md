---
title: "RequestAuthSampleCustomSigner"
id: "requestauthsamplecustomsigner"
---

API Name: global.RequestAuthSampleCustomSigner

```js
var RequestAuthSampleCustomSigner = Class.create();
RequestAuthSampleCustomSigner.prototype = Object.extend(new RequestAuthInternal(), {
    
	initialize: function() {
        RequestAuthInternal.prototype.initialize.call(this);
    },

	/*Override generateAuth if you are writing your own custom signer.
	* It is a sample method to understand how to sign using custom authenticator.
	*/
    generateAuth: function(authAPI) {
		
		//read the request data into instance variables
		this.enableDebug(true);
		this.readRequestData(authAPI);
		
		//sign the data
		var encryptionUtil = new GlideCertificateEncryption();
		// generateMac() will
        // 1. UTF-8 encode the input String
        // 2. Generate the Hash with the desired algoritham
        // 3. Base 64 enocde the generated hash and returns it
        var signedHeader =  encryptionUtil.generateMac(this.secret_key, "HmacSHA256", this.getStringToSign());
		
		//return HttpRequestAuthedData object.
		var httpRequestSignedData = new sn_auth.HttpRequestAuthedData();
		httpRequestSignedData.addHeader("authorization", signedHeader);
        httpRequestSignedData.setStatus("SUCCESS"); //avilable status values :SUCCESS, FAIL, SKIPPED;
        httpRequestSignedData.setDirective("HEADER"); //use QUERY if signed data needs to be sent in query parameters
        return httpRequestSignedData;
	},
	
	getStringToSign: function() {
        var stringToSign = "";
		var headers = this.headerMap;
        var headerKeys =  Object.keys(headers);
		var headerValue;
		
		headerKeys.forEach(function(key) {
            headerValue = headers[key];
			if(headerValue){
				stringToSign += key+":"+headerValue+ "\n"; //"\n" is random terminal
				if(this.debugMode)
					gs.info("Header Key:{0} Value:{1}",[key,headerValue]);
			}
        }.bind(this));
		
		var queryParams = this.queryParamMap;
		var qpKeys = Object.keys(queryParams);
		var qpValue;
		
		qpKeys.forEach(function(key) {
            qpValue = queryParams[key];
			if(qpValue){
				stringToSign += key+":"+qpValue+ "\n"; //"\n" is random terminal
		
				if(this.debugMode)	
					gs.info("Request Param Key:{0} Value:{1}",[key,qpValue]);
			}
        }.bind(this));
		
		if(this.debugMode)
			gs.info("String to Sign:"+stringToSign);
			
        return stringToSign;
    },
	
	/*read request data into instance variables.
	* It is a sample method to understand how to read request data
	*/
	readRequestData: function(authAPI){
		var requestData = authAPI.getHttpRequestData();
        this.endpoint = requestData.getEndpoint();
        this.method = requestData.getHttpMethod().toUpperCase();
		
		if(this.debugMode){
			gs.info("Method:{0} Endpoint:{1}",[this.method, this.endpoint]);
		}
	
        this.queryParamMap = requestData.getQueryParamMap();
		
		this.headerMap = requestData.getHeaderMap();
		
        this.payload = requestData.getContent();

        // get credential fields if needed, these attributes are different based on credential type
        var credential = authAPI.getAuthCredential();
       // this.consumer_key = credential.getAttribute("consumer_key");
       // this.access_token = credential.getAttribute("access_token");
       // this.access_token_secret = credential.getAttribute("access_token_secret");
	},
	
	debugMode : false,
	
	enableDebug: function(flag) {
		this.debugMode = flag;
	},
	
    type: 'RequestAuthSampleCustomSigner'
});
```
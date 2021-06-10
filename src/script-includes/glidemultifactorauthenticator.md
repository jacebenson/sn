---
title: "GlideMultifactorAuthenticator"
id: "glidemultifactorauthenticator"
---

API Name: global.GlideMultifactorAuthenticator

```js
var GlideMultifactorAuthenticator = Class.create();
GlideMultifactorAuthenticator.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	validateResponse: function () {
		
		var response = this.getParameter("sysparm_response").toString();
		var enableMFAFlag = this.getParameter("sysparm_updateUserRecord").toString();
		var valid;
		if(enableMFAFlag=="true")
			valid = SNC.MultifactorAuthUtil.updateUserIfResponseValid(response, true);
		else
			valid = SNC.MultifactorAuthUtil.isResponseValid(response);
		
		var result = this.newItem("result");
		result.setAttribute("validated", valid);
		if(valid)
			SNC.SecurityEventSender.sendMultifactorAuthEventData("multifactor.auth.setup.success", null, null, false);
	},
	
	isEnabled: function() {
		var enabled = SNC.MultifactorAuthUtil.isEnabled();
		var result = this.newItem("result");
		result.setAttribute("enabled", enabled);
	},
	
	isValidated: function() {
		var validated = SNC.MultifactorAuthUtil.isValidated();
		var result = this.newItem("result");
		result.setAttribute("validated", validated);
	},
	
	resetCode: function(){
		SNC.MultifactorAuthUtil.reset(false);
		return this.loadPopupContent();
	},
	
	disableMFA: function(){
		SNC.MultifactorAuthUtil.reset(true);
	},
	
	forgetAllRememberedBrowsers: function() {
		SNC.MultiFactorAuthBrowserFingerPrintUtil.forgetAllRememberedBrowsers();
	},

	loadPopupContent: function(){
		var contentMap = new Packages.java.util.HashMap();
		var result = this.newItem("result");
		contentMap = SNC.MultifactorAuthUtil.loadPopupContent();
		if(contentMap != null) {
			result.setAttribute("validated", contentMap.get("validated").toString());
			result.setAttribute("qrCodeURL", contentMap.get("qrCodeURL").toString());
			result.setAttribute("qrCodeText", contentMap.get("qrCodeText").toString());
			result.setAttribute("canDisable", contentMap.get("canDisable").toString());
		}
	},
	
	loadPageContent: function(){
		var contentMap = new Packages.java.util.HashMap();
		var result = this.newItem("result");
		contentMap = SNC.MultifactorAuthUtil.loadPageContent();
		if(contentMap != null) {
			result.setAttribute("qrCodeURL", contentMap.get("qrCodeURL").toString());
			result.setAttribute("qrCodeText", contentMap.get("qrCodeText").toString());
			result.setAttribute("canBypass", contentMap.get("canBypass").toString());
			result.setAttribute("bypassRemainingCount", contentMap.get("bypassRemainingCount").toString());
		}
	},

	type: 'GlideMultifactorAuthenticator'
});
```
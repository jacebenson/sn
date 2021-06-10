---
title: "ConnectionAndCredentialHelper"
id: "connectionandcredentialhelper"
---

API Name: global.ConnectionAndCredentialHelper

```js
var ConnectionAndCredentialHelper = Class.create();
ConnectionAndCredentialHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    createConnectionAndCredential: function() {
        if (!this._isAuthorized()) {
            gs.logWarning("Failed to create connection and credential records. Access denied.");
            return;
        }
		
		var formSubmitData = this.getParameter("sysparm_formData");
        var aliasSysID = this.getParameter("sysparm_aliasSysID");
        var ccBuilder = new sn_cc.ConnectionBuilder();
        ccBuilder.setCheckACL(false);
        var ccResponse = ccBuilder.createCCWithDynamicInputs(aliasSysID, formSubmitData);
        
        return this._createJSONResponse(ccResponse.getStatus(),ccResponse.getID(),ccResponse.getMessage());
    },
	
	_isAuthorized: function() {
		var allowedRoles = ['admin', 'connection_admin'];
        if (gs.hasRole(allowedRoles))
            return true;
		return false;
	},
	
    getOAuthEntityProfileFromConnection: function() {
		if (!this._isAuthorized()) {
            gs.error("Failed to read OAuth entity profile. Access denied.");
            return;
        }
		var connectionSysId = this.getParameter("sysparm_connection_sys_id");
		var connectionGR = new GlideRecord('sys_connection');
		connectionGR.addQuery("sys_id",connectionSysId);
		connectionGR.setWorkflow(false);
		connectionGR.query();
		if (connectionGR.next()) {
			var credentialSysId = connectionGR.getValue('credential');
			var credentialGR = new GlideRecord('oauth_2_0_credentials');
			credentialGR.addQuery("sys_id",credentialSysId);
			credentialGR.setWorkflow(false);
			credentialGR.query();
			if (credentialGR.next()) {
				var oauth_entity_profile_id = credentialGR.getValue('oauth_entity_profile');
				var grant_type = this._getGrantTypeFromOAuthEntityProfile(oauth_entity_profile_id);
				if ((oauth_entity_profile_id != null) && (grant_type != null)) {
					var result = this.newItem("result");
					result.setAttribute("oauth_entity_profile_id", oauth_entity_profile_id);
					result.setAttribute("grant_type", grant_type);
					result.setAttribute("oauth_credentials_sys_id", credentialSysId);
				} else {
					gs.error("Invalid oauth_entity_profile:" + oauth_entity_profile_id + " or grant_type:" + grant_type);
				}
			}
		} else {
			gs.error('No connection record found for sys_id:' + connectionSysId);
		}
		return null;
	},

    _getGrantTypeFromOAuthEntityProfile: function(oauthProfileId) {
		var oauthProfileGR = new GlideRecord('oauth_entity_profile');
		oauthProfileGR.addQuery("sys_id",oauthProfileId);
		oauthProfileGR.setWorkflow(false);
		oauthProfileGR.query();
		if (oauthProfileGR.next()) {
			return oauthProfileGR.getValue('grant_type');
		} else {
			gs.error('No OAuth Entity Profile record found for sys_id:' + oauthProfileId);
			return null;
		}
	},
	
	_createErrorResponse: function(errorMessage){
		return {status:"FAIL",sysId:null, message:errorMessage};
	},
	
	_createSuccessResponse: function(sys_Id){
		return {status:"SUCCESS",sysId:sys_Id, message:""};
	},
	
	_createJSONResponse: function(rStatus,sys_Id,eMessage){
		return new JSON().encode({status:rStatus,sysId:sys_Id, message:eMessage});
	},

    type: 'ConnectionAndCredentialHelper'
});
```